import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import { useCalls } from '../calling/useCalls'

const KIND_LABEL = { ai: 'AI tele-caller', human: 'In-app call', practice: 'Practice with AI shopper' }

function useTimer(since?: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!since) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [since])
  if (!since) return ''
  const s = Math.max(0, Math.floor((now - since) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const initialsOf = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

/** Floating call panel: incoming ring, live call controls and the running transcript. */
export default function CallDock() {
  const { active, incoming, acceptIncoming, rejectIncoming, hangup, toggleMute } = useCalls()
  const timer = useTimer(active?.status === 'live' ? active.startedAt : undefined)
  const linesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    linesEnd.current?.scrollIntoView({ block: 'end' })
  }, [active?.lines.length])

  if (incoming && !active) {
    return (
      <div className="dock" role="alertdialog" aria-label="Incoming call">
        <div className="dock-top">
          <span className="initials ringing"><Phone size={14} /></span>
          <div className="grow">
            <div className="title">Customer softphone</div>
            <div className="status">Incoming call…</div>
          </div>
        </div>
        <div className="dock-btns">
          <button className="hang" onClick={rejectIncoming}><PhoneOff size={14} />Decline</button>
          <button className="accept" onClick={acceptIncoming}><Phone size={14} />Answer</button>
        </div>
      </div>
    )
  }
  if (!active) return null

  const statusText = {
    connecting: 'Connecting…',
    ringing: 'Ringing…',
    live: `Live · ${timer}`,
    ended: 'Call ended',
    failed: active.error ?? 'Call failed',
  }[active.status]

  return (
    <div className="dock" aria-live="polite">
      <div className="dock-top">
        <span className={active.status === 'ringing' ? 'initials ringing' : 'initials'}>{initialsOf(active.name)}</span>
        <div className="grow">
          <div className="title">{active.name}</div>
          <div className={active.status === 'failed' ? 'status failed' : 'status'}>
            {KIND_LABEL[active.kind]} · {statusText}
          </div>
        </div>
      </div>
      {active.lines.length > 0 && (
        <div className="dock-lines">
          {active.lines.map((l, i) => (
            <p key={i}><b>{l.who === 'you' ? 'You' : active.kind === 'human' ? 'Them' : 'AI'}</b>{l.text}</p>
          ))}
          <div ref={linesEnd} />
        </div>
      )}
      <div className="dock-btns">
        <button onClick={toggleMute} disabled={active.status !== 'live'} aria-pressed={active.muted}>
          {active.muted ? <MicOff size={14} /> : <Mic size={14} />}{active.muted ? 'Unmute' : 'Mute'}
        </button>
        <button className="hang" onClick={hangup}><PhoneOff size={14} />{active.status === 'failed' ? 'Close' : 'Hang up'}</button>
      </div>
    </div>
  )
}
