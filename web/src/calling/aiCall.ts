import { PipecatClient } from '@pipecat-ai/client-js'
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport'

export const CALL_SERVER = import.meta.env.VITE_CALL_SERVER ?? 'http://localhost:7860'

export type Persona = 'shopper' | 'telecaller'
export type Line = { who: 'you' | 'ai'; text: string }

type Handlers = {
  onLine: (line: Line) => void
  onStatus: (status: 'connecting' | 'live' | 'ended') => void
}

/** Starts a browser voice call with the AI (Pipecat over WebRTC). Returns a hang-up function. */
export async function startAiCall(persona: Persona, lead: string, h: Handlers) {
  const audio = new Audio()
  audio.autoplay = true

  const client = new PipecatClient({
    transport: new SmallWebRTCTransport(),
    enableMic: true,
    enableCam: false,
    callbacks: {
      onTrackStarted: (track, participant) => {
        if (track.kind === 'audio' && !participant?.local) audio.srcObject = new MediaStream([track])
      },
      onBotReady: () => h.onStatus('live'),
      onUserTranscript: (d) => d.final && h.onLine({ who: 'you', text: d.text }),
      // each sentence arrives once when generated and again when spoken; keep the first
      onBotOutput: (d) => d.text_type === 'sentence' && d.spoken_status !== 'completed' && h.onLine({ who: 'ai', text: d.text }),
      onDisconnected: () => h.onStatus('ended'),
    },
  })

  h.onStatus('connecting')
  const qs = new URLSearchParams({ persona, lead })
  await client.connect({ webrtcRequestParams: { endpoint: `${CALL_SERVER}/api/offer?${qs}` } })

  return () => {
    client.disconnect()
    audio.srcObject = null
  }
}
