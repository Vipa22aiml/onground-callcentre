import { useState } from 'react'
import { Bot, ChevronLeft, ChevronRight, Phone, UserRound } from 'lucide-react'
import leadsData from '../data/leads.json'
import PlannerHead from '../components/PlannerHead'
import LeadsModal from '../components/LeadsModal'
import { useCalls } from '../calling/useCalls'
import type { Lead } from '../types'

const PAGE = 2
const leads = [...(leadsData as Lead[])].sort((a, b) => b.score - a.score)
const pages = Math.ceil(leads.length / PAGE)

export default function CallsToMake() {
  const [page, setPage] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [modalAt, setModalAt] = useState<number | null>(null)
  const { callHuman, startAi } = useCalls()
  const shown = leads.slice(page * PAGE, page * PAGE + PAGE)

  return (
    <>
      <PlannerHead />
      <div className="pad">
        <div className="list-head">
          <h2>Planned outgoing calls</h2>
          <div className="sub">Ranked by lead attractiveness score — tap a lead for the full picture</div>
        </div>
        {shown.map((lead) => {
          const open = openId === lead.id
          return (
            <div className="lead-row" key={lead.id}>
              <button aria-expanded={open} onClick={() => setOpenId(open ? null : lead.id)}>
                <span className={lead.score >= 90 && lead.initials !== 'MK' ? 'initials' : 'initials green'}>{lead.initials}</span>
                <div className="grow">
                  <div className="title">{lead.name}</div>
                  <div className="sub">Interested: {lead.product} · ₹{lead.price.toLocaleString('en-IN')}</div>
                </div>
                <div className="score">{lead.score}<small>SCORE</small></div>
              </button>
              {open && (
                <div className="lead-detail">
                  <div className="next-action" style={{ justifySelf: 'start' }}>{lead.nextAction} · {lead.slaLeft}</div>
                  <ul>{lead.signals.map((s) => <li key={s.title}><b>{s.title}:</b> {s.note}</li>)}</ul>
                  <div className="actions">
                    <button className="btn primary small" onClick={() => callHuman(lead)}><Phone size={12} />Call now</button>
                    <button className="btn purple small" onClick={() => startAi('telecaller', lead)}><Bot size={12} />Let AI call</button>
                    <button className="btn small" onClick={() => setModalAt(leads.indexOf(lead))}><UserRound size={12} />Full picture</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <div className="pager">
          <button aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={13} /></button>
          Page {page + 1} of {pages}
          <button aria-label="Next page" disabled={page === pages - 1} onClick={() => setPage(page + 1)}><ChevronRight size={13} /></button>
        </div>
      </div>
      {modalAt !== null && <LeadsModal leads={leads} start={modalAt} onClose={() => setModalAt(null)} />}
    </>
  )
}
