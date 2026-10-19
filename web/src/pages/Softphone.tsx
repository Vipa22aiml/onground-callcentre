import { useEffect, useRef, useState } from 'react'
import type Peer from 'peerjs'
import type { MediaConnection } from 'peerjs'
import { Phone, PhoneOff } from 'lucide-react'
import { answer, dial, openLine, peerId, roomCode } from '../calling/peerCall'

type State = 'connecting' | 'idle' | 'ringing' | 'calling' | 'live' | 'error'

/** The customer's phone for the human-to-human demo: open /phone?c=<code> on a second device. */
export default function Softphone() {
  const [state, setState] = useState<State>('connecting')
  const [error, setError] = useState('')
  const peer = useRef<Peer | null>(null)
  const pending = useRef<MediaConnection | null>(null)
  const end = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Deferred a tick so React StrictMode's double mount doesn't register the peer id twice.
    const t = setTimeout(() => {
      const p = openLine(
        'phone',
        (call) => { pending.current = call; setState('ringing') },
        (msg) => { setError(msg); setState('error') },
      )
      p.on('open', () => setState('idle'))
      peer.current = p
    })
    return () => {
      clearTimeout(t)
      peer.current?.destroy()
    }
  }, [])

  const done = () => { end.current = null; setState('idle') }

  const pickUp = async () => {
    if (!pending.current) return
    const c = await answer(pending.current, done)
    end.current = c.end
    setState('live')
  }

  const callDesk = async () => {
    if (!peer.current) return
    setState('calling')
    const c = await dial(peer.current, peerId('agent'), done)
    end.current = c.end
    c.call.on('stream', () => setState('live'))
  }

  const hangUp = () => {
    if (end.current) end.current()
    else pending.current?.close()
    done()
  }

  const label = {
    connecting: 'Connecting…', idle: 'Ready. Waiting for the call centre.', ringing: 'The Sleep Company is calling…',
    calling: 'Calling the call centre…', live: 'On a call', error,
  }[state]

  return (
    <div className="phone">
      <div>
        <div className="sub" style={{ color: '#9fd8c4' }}>Customer softphone · room {roomCode()}</div>
        <h1 style={{ fontSize: 18, marginTop: 6 }}>Mukunda's phone</h1>
        <p className="status">{label}</p>
        <div className="btn-row">
          {state === 'ringing' && <button className="big" style={{ background: '#16a34a' }} aria-label="Answer" onClick={pickUp}><Phone /></button>}
          {state === 'idle' && <button className="big" style={{ background: '#16a34a' }} aria-label="Call the call centre" onClick={callDesk}><Phone /></button>}
          {(state === 'ringing' || state === 'calling' || state === 'live') && (
            <button className="big" style={{ background: '#dc2626' }} aria-label="Hang up" onClick={hangUp}><PhoneOff /></button>
          )}
          {state === 'error' && <button className="btn" onClick={() => location.reload()}>Retry</button>}
        </div>
        {state === 'idle' && <p className="sub" style={{ color: '#b6c9c1', marginTop: 10 }}>Tap to call the agent desk, or wait for a Call back.</p>}
      </div>
    </div>
  )
}
