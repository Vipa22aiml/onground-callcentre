import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Hash, Headset, ListChecks, MessageCircle, Mic, Search, ShoppingCart, Sparkles, Target, Trophy } from 'lucide-react'
import pulse from '../data/pulse.json'
import type { Agent } from '../types'

const agents = pulse.agents as Agent[]
const ICON: Record<string, typeof Bot> = {
  'callcentre-agent': Headset, 'cross-sell-agent': ShoppingCart, 'sop-agent': ListChecks,
  'lead-conversion-agent': Target, 'capture-agent': Mic,
}
const BRIEF = 'Daily brief: 2 callbacks due (next Priya Iyer at 4:30pm), 2 hot leads untouched for 24h (Ritu S., Mukunda), and greeting-in-10s QA is at 71% against an 85% target.'

function AgentRow({ a }: { a: Agent }) {
  const Icon = ICON[a.id] ?? Bot
  return (
    <Link to={`/pulse/${a.id}`} className="agent" style={{ '--c': a.color } as React.CSSProperties}>
      <span className="ico"><Icon size={13} /></span>
      <div className="grow"><div className="title"># {a.name}</div><div className="sub">{a.subtitle}</div></div>
      <div className="metric">{a.metric}{a.unread ? <span className="unread">{a.unread}</span> : null}</div>
    </Link>
  )
}

export default function PulseHome() {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const q = query.trim().toLowerCase()
  const match = (a: { name: string }) => !q || a.name.includes(q)

  return (
    <>
      <div className="pulse-head">
        <span className="pulse-logo">{['#ef4444', '#f59e0b', '#10b981', '#3b82f6'].map((c) => <i key={c} style={{ background: c }} />)}</span>
        Pulse <small>The Sleep Company · Koramangala</small>
      </div>
      <div className="pad">
        <label className="search">
          <span className="spark"><Sparkles size={12} /></span>
          <input placeholder="Ask AvaniBot or search Pulse…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Search size={14} />
        </label>

        <div className="avani">
          <div className="title">✨ AvaniBot <span className="tag">ALWAYS ON</span></div>
          <p>Ask me about anything happening in Pulse — daily briefs, action items, quick answers</p>
          <div className="avani-actions">
            <button onClick={() => setAnswer(BRIEF)}><Sparkles size={12} />Daily Brief</button>
            <button onClick={() => setAnswer(q ? `Searching Pulse for “${query}”: see the matching channels below.` : 'Type a question in the search box above, then tap Ask a question.')}>
              <MessageCircle size={12} />Ask a question
            </button>
          </div>
          {answer && <div className="avani-answer">{answer}</div>}
        </div>

        <div className="card agents">
          <div className="row-card" style={{ boxShadow: 'none', padding: 0, margin: 0 }}>
            <span className="spark" style={{ background: '#f3e8ff', color: '#7c3aed' }}><Sparkles size={12} /></span>
            <div><div className="title">Custom Agents</div><div className="sub">Set up by <b>your manager</b> — already live, tap to open</div></div>
          </div>
          <div className="group-label">ROLE AGENTS<small>run a team</small></div>
          {agents.filter((a) => a.group === 'role' && match(a)).map((a) => <AgentRow a={a} key={a.id} />)}
          <div className="group-label">TASK AGENTS<small>move one metric</small></div>
          {agents.filter((a) => a.group === 'task' && match(a)).map((a) => <AgentRow a={a} key={a.id} />)}
        </div>

        <div className="section-label">General</div>
        <div className="row-card">
          <MessageCircle size={14} color="#16a34a" />
          <div><div className="title">customer-discussions</div><div className="sub">Relayed via WhatsApp Business</div></div>
        </div>

        <div className="kudos">
          <Trophy size={18} />
          <div className="grow">
            <div className="title">Kudos <span className="new">{pulse.kudos.count} NEW</span></div>
            <p>“{pulse.kudos.quote}” — {pulse.kudos.by}</p>
          </div>
          <b>{pulse.kudos.total}</b>
        </div>

        <div className="section-label">Channels</div>
        {pulse.channels.filter(match).map((c) => (
          <Link to={`/pulse/${c.id}`} className="row-card" key={c.id}>
            <Hash size={14} color="#6b7280" />
            <div><div className="title">{c.name}</div><div className="sub">{c.subtitle}</div></div>
          </Link>
        ))}
      </div>
    </>
  )
}
