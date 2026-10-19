import { useState } from 'react'
import { PhoneIncoming, PhoneMissed, PhoneOutgoing } from 'lucide-react'
import recentData from '../data/recent.json'
import PlannerHead from '../components/PlannerHead'
import { useCalls } from '../calling/useCalls'
import type { RecentCall } from '../types'

const ICON = { outgoing: PhoneOutgoing, incoming: PhoneIncoming, missed: PhoneMissed }
const WHO = { you: 'You', them: 'Customer', ai: 'AI' }

export default function Recent() {
  const { log } = useCalls()
  const [openId, setOpenId] = useState<string | null>(null)
  const calls = [...log, ...(recentData as RecentCall[])]

  return (
    <>
      <PlannerHead />
      <div className="pad">
        <div className="list-head">
          <h2>Recent calls</h2>
          <div className="sub">Tap a call to review it against SOP</div>
        </div>
        {calls.map((c) => {
          const Icon = ICON[c.type]
          const open = openId === c.id
          return (
            <div className="lead-row" key={c.id}>
              <button aria-expanded={open} onClick={() => setOpenId(open ? null : c.id)}>
                <span className={`call-ico ${c.type}`}><Icon size={14} /></span>
                <div className="grow">
                  <div className="title">{c.name}{c.kind && c.kind !== 'human' && <span className="tag-ai">AI</span>}{c.summary && <span className="chip outcome inline">{c.summary.outcome}</span>}</div>
                  <div className="sub">{c.when} · {c.duration ?? '—'}</div>
                </div>
              </button>
              {open && (
                <div className="review">
                  {c.summary && (
                    <div className="summary-card">
                      <div className="chips">
                        <span className="chip outcome">{c.summary.outcome}</span>
                        <span className={`chip ${c.summary.sentiment}`}>{c.summary.sentiment}</span>
                      </div>
                      <p>{c.summary.summary}</p>
                      <p><b>Next:</b> {c.summary.next_step}</p>
                    </div>
                  )}
                  {c.sop && (
                    <div className="sop">
                      {c.sop.map((s) => <span key={s.item} className={s.done ? 'ok' : 'no'}>{s.done ? '✓' : '✗'} {s.item}</span>)}
                    </div>
                  )}
                  {c.transcript?.length ? (
                    <div className="transcript">
                      {c.transcript.map((l, i) => <p key={i}><b>{WHO[l.who]}:</b>{l.text}</p>)}
                    </div>
                  ) : (
                    <div className="sub">{c.type === 'missed' ? 'Missed call — no recording. Call back from Incoming.' : 'No transcript for this call.'}</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
