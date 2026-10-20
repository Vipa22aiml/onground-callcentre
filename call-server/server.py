"""Voice AI call server: browser mic <-> WebSocket <-> Pipecat (Sarvam STT -> Gemini -> Sarvam TTS).

WS   /ws?persona=telecaller|shopper&lead=&product=&price=   one live AI call
POST /api/summary                                          AI summary of a finished call
GET  /                                                     health check

API keys live only in this server's environment. The browser never sees them, so a public
deployment lets anyone try the AI call without bringing their own keys. The limits below
keep a public deployment from burning through the keys' credits.
"""

import json
import os
import time
from collections import defaultdict, deque

import certifi

# python.org builds of Python ship without CA certificates; Sarvam's websockets need them
os.environ.setdefault("SSL_CERT_FILE", certifi.where())

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import TTSSpeakFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.serializers.protobuf import ProtobufFrameSerializer
from pipecat.services.google.llm import GoogleLLMService
from pipecat.services.sarvam.stt import SarvamSTTService
from pipecat.services.sarvam.tts import SarvamTTSService
from pipecat.transcriptions.language import Language
from pipecat.transports.websocket.fastapi import FastAPIWebsocketParams, FastAPIWebsocketTransport
from pydantic import BaseModel, Field

load_dotenv()

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
MAX_CALL_SECS = int(os.getenv("MAX_CALL_SECS", "180"))
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT_CALLS", "3"))
CALLS_PER_IP_PER_HOUR = int(os.getenv("CALLS_PER_IP_PER_HOUR", "10"))
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

LANGUAGE_RULE = (
    "This is a live phone call: one or two short sentences per turn, no lists, no markdown, no "
    "emojis. Open in English. If the customer speaks Hindi or Hinglish, switch to Hindi written "
    "in Devanagari. Never use any other language or script."
)

PERSONAS = {
    # AI tele-caller: the AI calls a lead who walked out without buying.
    "telecaller": (
        "You are Avani, a friendly tele-caller for The Sleep Company. You are calling {lead}, who "
        "visited the store and looked at the {product} ({price}) but left without buying. Greet "
        "them by name, ask what held them back, answer questions on EMI (0% for 6 months), the "
        "100-night trial and free delivery, and try to book a store visit or a callback time. If "
        "they are not interested, thank them politely and end."
    ),
    # Practise a call: the agent rehearses the pitch, the AI plays a hard-to-close shopper.
    "shopper": (
        "You are {lead}, a shopper who visited a premium mattress store last week and looked at "
        "the {product} ({price}). A call-centre agent is calling you back. You are interested but "
        "price-sensitive: ask about EMI options, mention a competitor quoted less, and ask about "
        "the 100-night trial. Only agree to visit again if the agent handles your concerns well. "
        "Wait for the agent to speak first."
    ),
}

app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=ALLOWED_ORIGINS or ["*"], allow_methods=["*"], allow_headers=["*"]
)
gemini = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

live_calls = 0
recent_by_ip: dict[str, deque[float]] = defaultdict(deque)  # ponytail: in-memory, per process


def client_ip(headers, fallback: str) -> str:
    return headers.get("x-forwarded-for", fallback).split(",")[0].strip()


def over_limit(key: str, limit: int) -> bool:
    hits = recent_by_ip[key]
    while hits and hits[0] < time.time() - 3600:
        hits.popleft()
    if len(hits) >= limit:
        return True
    hits.append(time.time())
    return False


def clean(value: str, default: str, limit: int = 40) -> str:
    """Query params go into the prompt; keep them short and printable."""
    value = "".join(ch for ch in value if ch.isprintable())[:limit].strip()
    return value or default


@app.get("/")
async def health():
    return {"ok": True, "live_calls": live_calls}


@app.websocket("/ws")
async def call(ws: WebSocket, persona: str = "telecaller", lead: str = "", product: str = "", price: str = ""):
    global live_calls
    origin = ws.headers.get("origin", "")
    ip = client_ip(ws.headers, ws.client.host if ws.client else "?")
    # Refuse before accepting, so the browser's connect fails at once instead of hanging.
    if ALLOWED_ORIGINS and origin not in ALLOWED_ORIGINS:
        return await ws.close(code=4003)
    if live_calls >= MAX_CONCURRENT or over_limit(ip, CALLS_PER_IP_PER_HOUR):
        return await ws.close(code=4029)
    await ws.accept()

    persona = persona if persona in PERSONAS else "telecaller"
    lead, product = clean(lead, "there"), clean(product, "Ortho GRID mattress")
    prompt = PERSONAS[persona].format(lead=lead, product=product, price=clean(price, "Rs 8,490", 20))
    # Scripted opening, spoken straight away: the free-tier LLM can take several seconds to answer,
    # and silence at the start of a call sounds broken.
    greeting = f"Hi {lead.split()[0]}, this is Avani from The Sleep Company. I saw you checked out the {product} at our store. Do you have a minute?"

    transport = FastAPIWebsocketTransport(
        websocket=ws,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            serializer=ProtobufFrameSerializer(),
            session_timeout=MAX_CALL_SECS,
        ),
    )
    stt = SarvamSTTService(api_key=os.environ["SARVAM_API_KEY"])
    tts = SarvamTTSService(
        api_key=os.environ["SARVAM_API_KEY"],
        settings=SarvamTTSService.Settings(
            model="bulbul:v3",
            voice="priya" if persona == "telecaller" else "rahul",
            language=Language.HI,  # Bulbul's hi-IN voices read English and Devanagari Hindi
        ),
    )
    llm = GoogleLLMService(
        api_key=os.environ["GEMINI_API_KEY"],
        settings=GoogleLLMService.Settings(
            model=GEMINI_MODEL,
            thinking=GoogleLLMService.ThinkingConfig(thinking_level="minimal"),  # calls need speed
            system_instruction=f"{prompt} {LANGUAGE_RULE}",
        ),
    )

    context = LLMContext()
    agg = LLMContextAggregatorPair(
        context, user_params=LLMUserAggregatorParams(vad_analyzer=SileroVADAnalyzer())
    )
    pipeline = Pipeline(
        [transport.input(), stt, agg.user(), llm, tts, transport.output(), agg.assistant()]
    )
    task = PipelineTask(
        pipeline,
        params=PipelineParams(enable_metrics=True, audio_in_sample_rate=16000, audio_out_sample_rate=24000),
    )

    @transport.event_handler("on_client_connected")
    async def on_connected(_transport, _client):
        if persona == "telecaller":  # the caller speaks first
            await task.queue_frames([TTSSpeakFrame(greeting, append_to_context=True)])

    @transport.event_handler("on_client_disconnected")
    async def on_disconnected(_transport, _client):
        await task.cancel()

    @transport.event_handler("on_session_timeout")
    async def on_timeout(_transport, _client):
        logger.info(f"Call hit the {MAX_CALL_SECS}s limit")
        await task.cancel()

    live_calls += 1
    try:
        await PipelineRunner(handle_sigint=False).run(task)
    finally:
        live_calls -= 1


class Transcript(BaseModel):
    lead: str = Field(max_length=60)
    kind: str = Field(max_length=20)
    lines: list[dict] = Field(max_length=80)


@app.post("/api/summary")
async def summary(body: Transcript, request: Request):
    ip = client_ip(request.headers, request.client.host if request.client else "?")
    if over_limit(f"{ip}:summary", 30):
        raise HTTPException(429, "Too many summaries this hour")
    text = "\n".join(f"{str(line.get('who'))[:6]}: {str(line.get('text'))[:400]}" for line in body.lines)
    if not text.strip():
        raise HTTPException(400, "Empty transcript")
    prompt = (
        f"Summarise this {body.kind} sales call with {body.lead} for a call-centre manager. "
        'Reply with JSON only: {"summary": one sentence, "outcome": one of "visit booked", '
        '"callback", "interested", "not interested", "no answer", "next_step": one short '
        'imperative sentence, "sentiment": one of "positive", "neutral", "negative"}.\n\n' + text
    )
    reply = await gemini.aio.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={"response_mime_type": "application/json", "thinking_config": {"thinking_level": "minimal"}},
    )
    try:
        return json.loads(reply.text or "{}")
    except json.JSONDecodeError:
        raise HTTPException(502, "Model returned an unreadable summary")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "7860")))
