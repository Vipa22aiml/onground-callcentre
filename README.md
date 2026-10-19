# On-Ground.ai Call Centre: assignment build

A working rebuild of the On-Ground call-centre app: the screens from the mock, plus **real calling**.

- **Human to human:** the agent desk calls a customer's phone (a browser softphone), and the customer can call the desk.
- **AI to human:** an AI tele-caller ("Avani") calls you and holds a live voice conversation in English, Hindi or Kannada. "Practise a call" flips it so the AI plays a hard-to-close shopper.

Demo video: _add link_ · Live site: _add link_

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
| **Phone call**, **Let AI call** | AI tele-caller and you | Browser mic to `call-server` over WebRTC. [Pipecat](https://github.com/pipecat-ai/pipecat) runs the loop: Sarvam **Saarika** speech-to-text, then **Gemini** for the reply, then Sarvam **Bulbul** text-to-speech, with Silero VAD so you can interrupt the bot mid-sentence. |
| **Practise a call** | You and an AI shopper | Same pipeline with a different persona: a price-sensitive shopper who asks about EMI and quotes a competitor. |

Every finished call lands in **Recent** with its duration and, for AI calls, the full transcript.

**Why there is a small server despite the "no backend" rule:** all app data is local JSON (`web/src/data`). The only server is `call-server`, because speech-to-text, the LLM and text-to-speech need API keys that must never ship to a browser. It stores nothing.

**Why not a phone network (Twilio/Exotel):** a Twilio trial can only call verified numbers and adds a trial message, and Exotel/Plivo need business KYC. Browser calling shows the same product flow without those limits. Swapping in a phone number later means changing only Pipecat's transport (its Twilio serializer); the pipeline stays the same.

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
call-server/server.py   FastAPI + Pipecat voice bot
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
- The PeerJS public signalling server is fine for a demo. Production would self-host it and add a TURN server for strict networks.

## AI tools used

- **Claude Code:** used for scaffolding, reading the Pipecat source to get the current APIs right, and drafting components. I reviewed and tested every change and can walk through any file.
