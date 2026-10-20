import { useEffect, useRef, useState } from 'react'
import { Bot, Mic, MicOff, Phone, PhoneOff, Sparkles, X } from 'lucide-react'
import { useCalls, type ActiveCall } from '../calling/useCalls'

const KIND_LABEL = { ai: 'AI tele-caller · Avani', human: 'In-app call', practice: 'Practice · AI shopper' }

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

/** Five bars that dance while someone is talking. */
const Voice = ({ on }: { on: boolean }) => (
  <span className={on ? 'voice on' : 'voice'} aria-hidden>
    {[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ animationDelay: `${i * 0.11}s` }} />)}
  </span>
)

function Summary({ s }: { s: NonNullable<ActiveCall['summary']> }) {
  if (s === 'loading') return <div className="ai-summary"><Sparkles size={13} /> Writing the call summary…</div>
  if (s === 'failed') return <div className="ai-summary">Summary unavailable. The transcript is saved in Recent.</div>
  return (
    <div className="ai-summary">
      <div className="chips">
        <span className="chip outcome">{s.outcome}</span>
        <span className={`chip ${s.sentiment}`}>{s.sentiment}</span>
      </div>
      <p>{s.summary}</p>
      <p className="next"><b>Next:</b> {s.next_step}</p>
    </div>
  )
}

/** Floating call card: incoming ring, live call with captions, and the AI summary afterwards. */
export default function CallDock() {
  const { active, incoming, acceptIncoming, rejectIncoming, hangup, toggleMute } = useCalls()
  const timer = useTimer(active?.status === 'live' ? active.startedAt : undefined)
  const linesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    linesEnd.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [active?.lines.length])

  if (incoming && !active) {
    return (
      <div className="dock human" role="alertdialog" aria-label="Incoming call">
        <div className="dock-head">
          <span className="avatar-ring talking"><span className="initials"><Phone size={15} /></span></span>
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

  const isAi = active.kind !== 'human'
  const other = active.kind === 'ai' ? 'Avani' : active.kind === 'practice' ? active.name : 'Them'
  const statusText = {
    connecting: 'Connecting…',
    ringing: 'Ringing…',
    live: timer,
    ended: 'Call ended',
    failed: active.error ?? 'Call failed',
  }[active.status]
  const hint =
    active.status !== 'live' ? '' : active.speaking ? { ai: `${other} is speaking`, you: 'You are speaking', thinking: `${other} is thinking…` }[active.speaking] : 'Listening…'

  return (
    <div className={isAi ? 'dock ai' : 'dock human'} aria-live="polite">
      <div className="dock-head">
        <span className={active.speaking === 'ai' ? 'avatar-ring talking' : 'avatar-ring'}>
          <span className="initials">{isAi && active.kind === 'ai' ? <Bot size={15} /> : initialsOf(active.name)}</span>
        </span>
        <div className="grow">
          <div className="title">{active.name}</div>
          <div className={active.status === 'failed' ? 'status failed' : 'status'}>
            {KIND_LABEL[active.kind]} · {statusText}
          </div>
        </div>
        {active.status === 'live' && <span className="live-dot">LIVE</span>}
      </div>

      {active.product && (
        <div className="context">
          <span>{active.product}</span>
          {active.price ? <span>₹{active.price.toLocaleString('en-IN')}</span> : null}
          <span>{isAi ? 'Sarvam · Gemini' : 'WebRTC'}</span>
        </div>
      )}

      {active.status === 'live' && (
        <div className="meter"><Voice on={active.speaking === 'ai' || active.speaking === 'you'} />{hint}</div>
      )}

      {active.lines.length > 0 && (
        <div className="captions">
          {active.lines.map((l, i) => (
            <p key={i} className={l.who === 'you' ? 'cap you' : 'cap'}>{l.text}</p>
          ))}
          <div ref={linesEnd} />
        </div>
      )}

      {active.summary && <Summary s={active.summary} />}

      <div className="dock-btns">
        {active.status === 'ended' ? (
          <button onClick={hangup}><X size={14} />Close</button>
        ) : (
          <>
            <button onClick={toggleMute} disabled={active.status !== 'live'} aria-pressed={active.muted}>
              {active.muted ? <MicOff size={14} /> : <Mic size={14} />}{active.muted ? 'Unmute' : 'Mute'}
            </button>
            <button className="hang" onClick={hangup}><PhoneOff size={14} />{active.status === 'failed' ? 'Close' : 'Hang up'}</button>
          </>
        )}
      </div>
    </div>
  )
}
