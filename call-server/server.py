"""Voice AI call server: browser mic <-> WebRTC <-> Pipecat (Sarvam STT -> Gemini -> Sarvam TTS).

POST /api/offer?persona=shopper|telecaller&lead=<name>   WebRTC offer from the browser
PATCH /api/offer                                         trickle ICE candidates
GET  /api/calls                                          transcripts of finished AI calls
"""

import asyncio
import os
import time
import uuid

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.services.google.llm import GoogleLLMService
from pipecat.services.sarvam.stt import SarvamSTTService
from pipecat.services.sarvam.tts import SarvamTTSService
from pipecat.transcriptions.language import Language
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.request_handler import (
    IceCandidate,
    SmallWebRTCPatchRequest,
    SmallWebRTCRequest,
    SmallWebRTCRequestHandler,
)
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport

load_dotenv()

LANGUAGE_RULE = (
    "Speak like a real person on a phone call: one or two short sentences per turn, no lists, "
    "no markdown, no emojis. Reply in the language the other person uses (English, Hindi or "
    "Kannada); write Hindi in Devanagari and Kannada in Kannada script."
)

PERSONAS = {
    # Practise a call: the agent rehearses the pitch, the AI plays a hard-to-close shopper.
    "shopper": (
        "You are {lead}, a shopper who visited a premium mattress store last week and looked at "
        "the Ortho GRID mattress (Rs 8,490). A call-centre agent is calling you back. You are "
        "interested but price-sensitive: ask about EMI options, mention a competitor quoted less, "
        "and ask about the 100-night trial. Only agree to visit again if the agent handles your "
        "concerns well. Wait for the agent to speak first."
    ),
    # AI tele-caller: the AI calls a lead who walked out without buying.
    "telecaller": (
        "You are Avani, a friendly tele-caller for The Sleep Company. You are calling {lead}, who "
        "visited the store and looked at the Ortho GRID mattress (Rs 8,490) but left without "
        "buying. Greet them by name, ask what held them back, answer questions on EMI (0% for "
        "6 months), the 100-night trial and free delivery, and try to book a store visit or a "
        "callback time. If they are not interested, thank them politely and end."
    ),
}

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
webrtc = SmallWebRTCRequestHandler()
calls: list[dict] = []  # ponytail: in-memory call log, resets on restart; fine for a demo


async def run_bot(conn: SmallWebRTCConnection, persona: str, lead: str):
    transport = SmallWebRTCTransport(
        webrtc_connection=conn,
        params=TransportParams(audio_in_enabled=True, audio_out_enabled=True),
    )
    stt = SarvamSTTService(api_key=os.environ["SARVAM_API_KEY"])
    tts = SarvamTTSService(
        api_key=os.environ["SARVAM_API_KEY"],
        settings=SarvamTTSService.Settings(
            model="bulbul:v3",
            voice=os.getenv("SARVAM_VOICE", "priya" if persona == "telecaller" else "rahul"),
            language=Language(os.getenv("TTS_LANGUAGE", "hi-IN")),
        ),
    )
    llm = GoogleLLMService(
        api_key=os.environ["GEMINI_API_KEY"],
        settings=GoogleLLMService.Settings(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            thinking=GoogleLLMService.ThinkingConfig(thinking_budget=0),  # phone calls need speed
            system_instruction=PERSONAS[persona].format(lead=lead) + " " + LANGUAGE_RULE,
        ),
    )

    context = LLMContext()
    agg = LLMContextAggregatorPair(
        context, user_params=LLMUserAggregatorParams(vad_analyzer=SileroVADAnalyzer())
    )
    pipeline = Pipeline(
        [transport.input(), stt, agg.user(), llm, tts, transport.output(), agg.assistant()]
    )
    task = PipelineTask(pipeline, params=PipelineParams(enable_metrics=True))
    record = {"id": uuid.uuid4().hex[:8], "persona": persona, "lead": lead, "started": time.time()}

    @transport.event_handler("on_client_connected")
    async def on_connected(_transport, _client):
        if persona == "telecaller":  # the caller speaks first
            context.add_message({"role": "user", "content": "(The call connects. Start the call.)"})
            await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_disconnected(_transport, _client):
        record["ended"] = time.time()
        record["messages"] = [
            {"role": m["role"], "text": m["content"]}
            for m in context.get_messages()
            if isinstance(m.get("content"), str) and not m["content"].startswith("(")
        ]
        calls.insert(0, record)
        await task.cancel()

    await PipelineRunner(handle_sigint=False).run(task)


@app.post("/api/offer")
async def offer(request: Request, background: BackgroundTasks, persona: str = "shopper", lead: str = "Mukunda"):
    if persona not in PERSONAS:
        persona = "shopper"
    body = await request.json()

    async def on_conn(conn: SmallWebRTCConnection):
        background.add_task(run_bot, conn, persona, lead[:40])

    return await webrtc.handle_web_request(SmallWebRTCRequest.from_dict(body), on_conn)


@app.patch("/api/offer")
async def ice(request: Request):
    body = await request.json()
    candidates = [IceCandidate(**c) for c in body.get("candidates", [])]
    await webrtc.handle_patch_request(SmallWebRTCPatchRequest(pc_id=body["pc_id"], candidates=candidates))
    return {"status": "ok"}


@app.get("/api/calls")
async def list_calls():
    return calls


@app.on_event("shutdown")
async def shutdown():
    await webrtc.close()


if __name__ == "__main__":
    import uvicorn

    logger.info("Call server on http://localhost:7860")
    uvicorn.run(app, host="0.0.0.0", port=7860)
