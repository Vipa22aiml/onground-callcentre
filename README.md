# On-Ground.ai Call Centre: assignment build

A working rebuild of the On-Ground call-centre app: the screens from the mock, plus **real calling**.

- **Human to human:** the agent desk calls a customer's phone (a browser softphone), and the customer can call the desk.
- **AI to human:** an AI tele-caller ("Avani") calls you about the lead's product and holds a live voice conversation in English or Hindi. "Practise a call" flips it so the AI plays a hard-to-close shopper. After every AI call, Gemini writes a summary with outcome, sentiment and next step.
- **No keys needed to try it:** the hosted call server holds the API keys. The browser never sees them.

**Live site: https://onground-callcentre.netlify.app** (Chrome, allow the microphone; the first AI call after idle can take up to a minute while the free voice server wakes up)

## Run it

You need Node 20+ and Python 3.12 with [uv](https://docs.astral.sh/uv/).

```bash
# 1. the app
cd web
npm install
npm run dev            # http://localhost:5173

# 2. the voice AI server (only needed for AI calls)
cd call-server
cp .env.example .env   # add SARVAM_API_KEY and GEMINI_API_KEY
uv run python server.py   # http://localhost:7860
```

Human-to-human calls need no server: open the softphone link shown under the shield button in the DEMO strip (`/phone?c=<room>`) in a second tab, or on your phone (it must be served over HTTPS for the phone's mic; the deployed site is).

## How calling works

| Button | Who talks | How |
|---|---|---|
| **In-app call**, **Call back**, **Call now** | Agent (browser) and customer (softphone) | Browser-to-browser WebRTC with [PeerJS](https://peerjs.com). PeerJS's free cloud server only relays the handshake; audio flows peer to peer. The desk and the softphone share a short room code, so each knows the other's peer id. |
| Softphone **call button** | Customer calls the desk | Same path in reverse. The desk shows an Answer/Decline card. |
| **Phone call**, **Let AI call** | AI tele-caller and you | Browser mic streams to `call-server` over a WebSocket (Pipecat's protobuf serializer; Daily's audio engine gives echo cancellation). [Pipecat](https://github.com/pipecat-ai/pipecat) runs the loop: Sarvam **Saarika** speech-to-text, then **Gemini** for the reply, then Sarvam **Bulbul** text-to-speech, with Silero VAD so you can interrupt the bot mid-sentence. The call card shows live captions and who is speaking. |
| **Practise a call** | You and an AI shopper | Same pipeline with a different persona: a price-sensitive shopper who asks about EMI and quotes a competitor. |

Every finished call lands in **Recent** with its duration and, for AI calls, the full transcript and the AI summary (`POST /api/summary`).

**Why WebSocket rather than WebRTC for the AI leg:** WebRTC media needs UDP, which free hosts don't offer without a TURN server. A WebSocket runs on any HTTPS host, so the AI call works from the deployed site.

**Why there is a small server despite the "no backend" rule:** all app data is local JSON (`web/src/data`). The only server is `call-server`, because speech-to-text, the LLM and text-to-speech need API keys that must never ship to a browser. It stores nothing.

**Keeping the shared keys safe on a public demo:** the keys are server environment secrets (never in the repo or the bundle). The server also enforces:
- an origin allowlist (`ALLOWED_ORIGINS`), so other sites can't use it;
- 3 concurrent AI calls at most;
- 10 calls per IP per hour, and 30 summaries;
- a 3-minute cap per call.

**Why not a phone network (Twilio/Exotel):** a Twilio trial can only call verified numbers and adds a trial message, and Exotel/Plivo need business KYC. Browser calling shows the same product flow without those limits. Swapping in a phone number later means changing only Pipecat's transport (its Twilio serializer); the pipeline stays the same.

## Deploy

- **Call server → Render** (free, Docker): New → Blueprint → this repo. `render.yaml` sets it up; enter `SARVAM_API_KEY`, `GEMINI_API_KEY` and `ALLOWED_ORIGINS` (your Vercel URL) in the dashboard. The free tier sleeps after 15 idle minutes; the app pings it on load, and the first call after a sleep can take about a minute.
- **App → Vercel:** import the repo, root directory `web`, and set `VITE_CALL_SERVER` to the Render URL.

## Stack and why

- **React + TypeScript + Vite:** React is your preferred stack, TypeScript keeps the data shapes honest, and Vite builds fast.
- **Plain CSS with variables** (`src/index.css`): type sizes and colours stay close to the mock without a framework overriding them.
- **Recharts** for the two 7-day charts, **lucide-react** for icons, **react-router** for screens.
- **Pipecat + Sarvam + Gemini** for voice AI: Sarvam is built for Indian languages and accents, and Pipecat handles streaming, turn-taking and barge-in.

```
web/src
  calling/      aiCall.ts (Pipecat client) · peerCall.ts (PeerJS) · CallContext.tsx (call state) · useCalls.ts
  components/   Shell (sidebar, top bar) · CallDock · DemoStrip · LeadsModal · PlannerHead
  pages/        Dashboard · CallsToMake · Incoming · Recent · Practise · Calendar · PulseHome · Channel · Softphone
  data/         sample JSON
call-server/server.py   FastAPI + Pipecat voice bot, AI summaries, abuse limits
render.yaml             Render blueprint for the call server
```

## Done and skipped

| Must build | Status |
|---|---|
| App shell: sidebar and top bar | Done, with a drawer on narrow screens |
| Dashboard | Done: KPI cards, progress, who is waiting, earnings, tasks, two 7-day charts |
| Plan: Calls to make, Incoming, Recent | Done: ranked leads with expandable rows and paging; missed calls with value at stake and Call back; recent calls by type with SOP review and transcripts |
| Calendar | Done: month grid, event dots, Today, month switcher, upcoming list, click a day |
| Pulse home and channel chat | Done: AvaniBot (daily brief), role and task agents, channels, Kudos; chat with bubbles and times |
| Leads modal with paging | Done: opens from dashboard tasks and from "Full picture"; ICP, intent, collapsible sections, next/previous (arrow keys work too) |

| Bonus | Status |
|---|---|
| Send a message in a channel | Done |
| Answer the "Needs your input" card | Done (buttons or typed reply) |
| Practise a call and Call back | Done, both with real audio |
| Phone-width screen | Done |
| Charts with a library | Done (Recharts) |

**Skipped or simplified:**
- Data resets on reload, because there is no backend by design.
- AvaniBot's "Ask a question" does not call an LLM; the daily brief is canned.
- AI calls speak English and Hindi. Kannada needs the TTS language switched mid-call, which is left for later.
- The PeerJS public signalling server is fine for a demo. Production would self-host it and add a TURN server for strict networks.

## AI tools used

- **Claude Code:** used for scaffolding, reading the Pipecat source to get the current APIs right, and drafting components. I reviewed and tested every change and can walk through any file.
