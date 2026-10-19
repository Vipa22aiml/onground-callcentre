import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Mail } from 'lucide-react'
import eventsData from '../data/events.json'
import type { CalEvent } from '../types'

const events = eventsData as CalEvent[]
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function Calendar() {
  const [today] = useState(() => new Date())
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<string | null>(null)

  const year = month.getFullYear()
  const m = month.getMonth()
  const blanks = new Date(year, m, 1).getDay()
  const days = new Date(year, m + 1, 0).getDate()
  const shift = (n: number) => setMonth(new Date(year, m + n, 1))

  const listed = selected
    ? events.filter((e) => e.date === selected)
    : events.filter((e) => e.date >= iso(today)).slice(0, 4)

  return (
    <div className="pad cal-wrap">
      <div className="cal-title">
        <CalendarDays size={15} color="#2563eb" />
        <div>
          <h2 style={{ fontSize: 13 }}>Calendar</h2>
          <div className="sub">Mirrored from your mailbox — invites created here land there too</div>
        </div>
      </div>
      <div className="cal-note"><Mail size={14} color="#2563eb" />Store visits, coaching sessions, and meeting invites all show up here — and in your mailbox.</div>

      <div className="card cal">
        <div className="cal-head">
          <button className="round" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={14} /></button>
          <h2>{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2>
          <div>
            <button className="today-btn" onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(iso(today)) }}>Today</button>
            <button className="round" aria-label="Next month" onClick={() => shift(1)} style={{ display: 'inline-grid' }}><ChevronRight size={14} /></button>
          </div>
        </div>
        <div className="grid7">
          {DOW.map((d, i) => <div className="dow" key={i}>{d}</div>)}
          {Array.from({ length: blanks }, (_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: days }, (_, i) => {
            const date = iso(new Date(year, m, i + 1))
            const cls = ['day', date === iso(today) && 'today', date === selected && 'sel'].filter(Boolean).join(' ')
            return (
              <button key={date} className={cls} onClick={() => setSelected(date === selected ? null : date)} aria-pressed={date === selected}>
                {i + 1}
                {events.some((e) => e.date === date) && <span className="dot" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="section-label">{selected ? new Date(selected).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }) : 'Upcoming'}</div>
      {listed.length === 0 && <div className="sub">Nothing scheduled.</div>}
      {listed.map((e) => (
        <div className="row-card event" key={e.date + e.time}>
          <time>{new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {e.time}</time>
          <span className="title">{e.title}</span>
        </div>
      ))}
    </div>
  )
}
