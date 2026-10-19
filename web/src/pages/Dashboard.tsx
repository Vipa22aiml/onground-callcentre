import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis } from 'recharts'
import { CalendarDays, ClipboardCheck, Flame, Headset, PhoneCall } from 'lucide-react'
import dashboard from '../data/dashboard.json'
import leadsData from '../data/leads.json'
import LeadsModal from '../components/LeadsModal'
import type { Lead } from '../types'

const leads = [...(leadsData as Lead[])].sort((a, b) => b.score - a.score).slice(0, 5)
const TASK_ICON = { callback: PhoneCall, hot: Flame, outcome: ClipboardCheck }

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function WeekChart({ title, data, color, today, unit = '' }: { title: string; data: { day: string; v: number }[]; color: string; today: string; unit?: string }) {
  return (
    <>
      <div className="section-label" style={{ margin: '14px 14px 6px' }}>{title}</div>
      <div className="card chart-card">
        <ResponsiveContainer width="100%" height={92}>
          <BarChart data={data} margin={{ top: 16, right: 4, left: 4, bottom: 0 }} barCategoryGap={4}>
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Bar dataKey="v" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="v" position="top" formatter={(v) => `${v}${unit}`} style={{ fontSize: 10, fontWeight: 600, fill: '#374151' }} />
              {data.map((d) => <Cell key={d.day} fill={d.day === 'Today' ? today : color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

export default function Dashboard() {
  const [onQueue, setOnQueue] = useState(true)
  const [modalAt, setModalAt] = useState<number | null>(null)
  const { agent, kpis, progress, earnings, waiting, tasks, calls7, csat7 } = dashboard

  return (
    <>
      <section className="hero">
        <div className="hero-top">
          <div>
            <small>{greeting()} 👋</small>
            <h1>{agent.name}</h1>
            <div className="org">{agent.org}</div>
          </div>
          <div className="hero-actions">
            <button className={onQueue ? 'on-queue' : 'on-queue off'} onClick={() => setOnQueue(!onQueue)} aria-pressed={onQueue}>
              {onQueue ? 'On Queue' : 'Off Queue'}
            </button>
            <span className="week"><CalendarDays size={11} />This Week</span>
          </div>
        </div>
        <div className="kpis">
          {kpis.map((k) => (
            <div className="kpi" key={k.label}>
              <b>{k.value}</b>
              <span>{k.label}</span>
              <em className={k.tone === 'live' ? 'delta live' : 'delta'} style={{ fontStyle: 'normal' }}>{k.delta}</em>
            </div>
          ))}
        </div>
      </section>

      <div className="dash-grid">
        <div>
          <div className="progress-card">
            <div className="lbl">MY PROGRESS · TODAY</div>
            <div className="progress-tiles">
              {progress.map((p) => (
                <div key={p.label}><b>{p.value}</b><em>▲ {p.delta}</em><span>{p.label}</span></div>
              ))}
            </div>
          </div>
          <div className="waiting-head">
            <div className="section-label">Who's waiting</div>
            <Link to="/plan/incoming">Open planner →</Link>
          </div>
          {waiting.map((w) => (
            <div className="row-card" key={w.name}>
              <span className="initials" style={{ background: '#f1f3f6', color: '#6b7280' }}><Headset size={13} /></span>
              <div className="grow"><div className="title">{w.name}</div><div className="sub">{w.reason}</div></div>
              <span className={`wait ${w.tone}`}>{w.wait}</span>
            </div>
          ))}
        </div>

        <div>
          <div className="card earn">
            <div className="earn-top"><span>💰 My earnings this month</span><span>₹{earnings.min} to ₹{earnings.max.toLocaleString('en-IN')}</span></div>
            <b>₹{earnings.total.toLocaleString('en-IN')}</b> <span className="sub">₹{earnings.coached.toLocaleString('en-IN')} from coached moves</span>
            <div className="bar"><i style={{ width: `${(earnings.total / earnings.max) * 100}%` }} /></div>
          </div>
          <div className="tasks">
            <h3>📋 My Tasks <span className="count">{tasks.length}</span></h3>
            {tasks.map((t, n) => {
              const Icon = TASK_ICON[t.icon as keyof typeof TASK_ICON]
              return (
                <button className="task" key={t.id} onClick={() => setModalAt(n)}>
                  <span className="ico"><Icon size={13} /></span>
                  <span><b>{t.label}</b> <span className="sub">{t.hint}</span></span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <WeekChart title="Calls handled · last 7 days" data={calls7} color="#5cc8a0" today="#0f6b4f" />
      <WeekChart title="CSAT trend · last 7 days" data={csat7} color="#93b4f5" today="#1a5fb4" unit="%" />

      {modalAt !== null && <LeadsModal leads={leads} start={modalAt} onClose={() => setModalAt(null)} />}
    </>
  )
}
