import Peer, { type MediaConnection } from 'peerjs'

/**
 * Human-to-human calls: browser-to-browser WebRTC via PeerJS (its free cloud server only
 * relays the handshake; audio goes peer to peer). The agent desk and the customer softphone
 * (/phone) share a short room code, so each knows the other's peer id.
 */

const CODE_KEY = 'og-room'

export function roomCode(): string {
  const fromUrl = new URLSearchParams(location.search).get('c')
  if (fromUrl) return fromUrl
  try {
    const saved = localStorage.getItem(CODE_KEY)
    if (saved) return saved
    const code = Math.random().toString(36).slice(2, 7)
    localStorage.setItem(CODE_KEY, code)
    return code
  } catch {
    return 'demo1'
  }
}

export const peerId = (role: 'agent' | 'phone', code = roomCode()) => `onground-${code}-${role}`

export function openLine(
  role: 'agent' | 'phone',
  onIncoming: (call: MediaConnection) => void,
  onError: (message: string) => void,
): Peer {
  const peer = new Peer(peerId(role))
  peer.on('call', onIncoming)
  peer.on('error', (e) =>
    onError(e.type === 'peer-unavailable' ? 'The other phone is offline. Open the softphone link first.' : e.message),
  )
  return peer
}

const getMic = () => navigator.mediaDevices.getUserMedia({ audio: true, video: false })

/** Wires remote audio to a speaker and returns a hang-up function that also releases the mic. */
function connectAudio(call: MediaConnection, mic: MediaStream, onEnd: () => void) {
  const speaker = new Audio()
  speaker.autoplay = true
  call.on('stream', (remote) => (speaker.srcObject = remote))
  let ended = false
  const end = () => {
    if (ended) return
    ended = true
    mic.getTracks().forEach((t) => t.stop())
    speaker.srcObject = null
    call.close()
    onEnd()
  }
  call.on('close', end)
  call.on('error', end)
  return { end, mute: (on: boolean) => mic.getAudioTracks().forEach((t) => (t.enabled = !on)) }
}

export async function dial(peer: Peer, to: string, onEnd: () => void) {
  const mic = await getMic()
  const call = peer.call(to, mic)
  return { call, ...connectAudio(call, mic, onEnd) }
}

export async function answer(call: MediaConnection, onEnd: () => void) {
  const mic = await getMic()
  call.answer(mic)
  return connectAudio(call, mic, onEnd)
}
