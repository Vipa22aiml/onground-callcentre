import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pin, Smile } from 'lucide-react'
import pulse from '../data/pulse.json'
import type { Message } from '../types'

const nowLabel = () => new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase()

/** Renders **bold** segments; everything else stays plain text (no HTML injection). */
const rich = (text: string) => text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part))

function seed(id: string): Message[] {
  if (id === 'callcentre-team') return pulse.messages as Message[]
  return [{ id: 'w', author: id, initials: '🤖', time: '9:00am', text: `Welcome to **#${id}**. Updates for this metric are posted here.` }]
}

/** Keyed by channel id so switching channels resets the chat state. */
export default function ChannelPage() {
  const { id = '' } = useParams()
  return <Channel key={id} id={id} />
}

function Channel({ id }: { id: string }) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState(() => seed(id))
  const [draft, setDraft] = useState('')
  const [choice, setChoice] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [answered, setAnswered] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const { pinned } = pulse

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const post = (text: string) =>
    setMessages((m) => [...m, { id: String(Date.now()), author: 'You', initials: 'AR', time: nowLabel(), text, mine: true }])

  const send = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    post(draft.trim())
    setDraft('')
  }

  const answer = (text: string) => {
    setAnswered(text)
    post(`📌 Re "${pinned.title}": ${text}`)
  }

  return (
    <div className="channel">
      <div className="channel-head">
        <button className="round" aria-label="Back to Pulse" onClick={() => navigate('/pulse')}><ArrowLeft size={14} /></button>
        #{id}
      </div>

      {id === 'callcentre-team' && (
        <div className="pinned">
          <div className="pinned-label"><Pin size={12} />Needs your input {!answered && <span className="count">1</span>}<small>pinned</small></div>
          <div className="pinned-card">
            <div><div className="title">{pinned.title}</div><div className="sub">{pinned.subtitle}</div></div>
            {answered ? (
              <div className="answered">✓ Answered: {answered}</div>
            ) : (
              <>
                <div className="actions">
                  {pinned.options.map((o) => (
                    <button key={o} className={choice === o ? 'btn small primary' : 'btn small'} aria-pressed={choice === o} onClick={() => { setChoice(o); answer(o) }}>{o}</button>
                  ))}
                </div>
                <form className="reply" onSubmit={(e) => { e.preventDefault(); if (reply.trim()) answer(reply.trim()) }}>
                  <input placeholder="Or type your answer" value={reply} onChange={(e) => setReply(e.target.value)} />
                  <button className="send">Send</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <div className="messages">
        <div className="day-sep">Today · Call Centre Team</div>
        {messages.map((m) =>
          m.mine ? (
            <div className="msg mine" key={m.id}>
              <div className="meta"><b>You</b> {m.time}</div>
              <div className="bubble">{rich(m.text)}</div>
            </div>
          ) : (
            <div className="msg" key={m.id}>
              <span className="initials">{m.initials}</span>
              <div>
                <div className="meta"><b>{m.author}</b> {m.time}</div>
                <div className="bubble">{rich(m.text)}</div>
              </div>
            </div>
          ),
        )}
        <div ref={end} />
      </div>

      <div className="composer">
        <form onSubmit={send}>
          <input placeholder={`Message #${id}…`} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button className="round" aria-label="Emoji" type="button" onClick={() => setDraft((d) => d + '🙂')}><Smile size={14} /></button>
        </form>
      </div>
    </div>
  )
}
