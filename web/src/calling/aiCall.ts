import { PipecatClient } from '@pipecat-ai/client-js'
import { ProtobufFrameSerializer, WebSocketTransport } from '@pipecat-ai/websocket-transport'
import type { CallSummary, Line } from '../types'

export const CALL_SERVER = import.meta.env.VITE_CALL_SERVER ?? 'http://localhost:7860'
// Tunnels like ngrok put a warning page in front of browser requests unless this header is sent.
export const SERVER_HEADERS = { 'ngrok-skip-browser-warning': '1' }

export type Persona = 'shopper' | 'telecaller'
export type CallTarget = { name: string; product?: string; price?: number }

type Handlers = {
  onLine: (line: Line) => void
  onStatus: (status: 'connecting' | 'live' | 'ended') => void
  onSpeaking: (who: 'you' | 'ai' | null) => void
}

/**
 * Starts a voice call with the AI over a WebSocket (Pipecat). The call server holds the API keys;
 * the browser only streams audio. Returns hang-up and mute controls.
 */
export async function startAiCall(persona: Persona, target: CallTarget, h: Handlers) {
  const client = new PipecatClient({
    transport: new WebSocketTransport({ serializer: new ProtobufFrameSerializer(), playerSampleRate: 24000 }),
    enableMic: true,
    enableCam: false,
    callbacks: {
      onBotReady: () => h.onStatus('live'),
      onUserTranscript: (d) => d.final && h.onLine({ who: 'you', text: d.text }),
      // each sentence arrives once when generated and again when spoken; keep the first
      onBotOutput: (d) => d.text_type === 'sentence' && d.spoken_status !== 'completed' && h.onLine({ who: 'ai', text: d.text }),
      onBotStartedSpeaking: () => h.onSpeaking('ai'),
      onBotStoppedSpeaking: () => h.onSpeaking(null),
      onUserStartedSpeaking: () => h.onSpeaking('you'),
      onUserStoppedSpeaking: () => h.onSpeaking(null),
      onDisconnected: () => h.onStatus('ended'),
    },
  })

  h.onStatus('connecting')
  const qs = new URLSearchParams({
    persona,
    lead: target.name,
    product: target.product ?? '',
    price: target.price ? `Rs ${target.price.toLocaleString('en-IN')}` : '',
  })
  try {
    await client.connect({ wsUrl: `${CALL_SERVER.replace(/^http/, 'ws')}/ws?${qs}` })
  } catch {
    throw new Error('AI line unavailable: the call server is offline, busy, or the hourly limit is reached.')
  }

  return {
    end: () => {
      client.disconnect().catch(() => {}) // throws if the mic never started; the call is over either way
    },
    mute: (on: boolean) => client.enableMic(!on),
  }
}

/** Asks the call server for a short AI summary of a finished call. */
export async function summarize(lead: string, kind: string, lines: Line[]): Promise<CallSummary> {
  const res = await fetch(`${CALL_SERVER}/api/summary`, {
    method: 'POST',
    headers: { ...SERVER_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead, kind, lines: lines.slice(-80) }),
  })
  if (!res.ok) throw new Error(`Summary failed (${res.status})`)
  return res.json()
}
