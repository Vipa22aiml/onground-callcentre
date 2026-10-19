import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ClipboardList, IndianRupee, ReceiptText, ShieldCheck, Target, Truck, Users, X } from 'lucide-react'
import type { Lead, Signal } from '../types'

const SIGNAL_ICON: Record<Signal['kind'], ReactNode> = {
  financing: <IndianRupee size={13} color="#b45309" />,
  quotation: <ReceiptText size={13} color="#b45309" />,
  warranty: <ShieldCheck size={13} color="#b45309" />,
  delivery: <Truck size={13} color="#b45309" />,
}

function Fold({ title, tone = '', defaultOpen = false, children }: { title: ReactNode; tone?: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`fold ${tone}`}>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{title}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="fold-body">{children}</div>}
    </div>
  )
}

type Props = { leads: Lead[]; start?: number; onClose: () => void }

export default function LeadsModal({ leads, start = 0, onClose }: Props) {
  const [i, setI] = useState(start)
  const lead = leads[i]
  const last = leads.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, last))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, onClose])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Leads" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <Users size={16} />
          <div>
            <b>Leads</b>
            <small>Lead {i + 1} of {leads.length} · SLA to close</small>
          </div>
          <button className="x" aria-label="Close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-pager">
          <button className="round" aria-label="Previous lead" disabled={i === 0} onClick={() => setI(i - 1)} style={{ opacity: i === 0 ? 0.3 : 1 }}>
            <ChevronLeft size={14} />
          </button>
          <div className="dots">{leads.map((l, n) => <i key={l.id} className={n === i ? 'on' : ''} />)}</div>
          <button className="round" aria-label="Next lead" disabled={i === last} onClick={() => setI(i + 1)} style={{ opacity: i === last ? 0.3 : 1 }}>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="modal-body" key={lead.id}>
          <span className="open">OPEN</span>
          <div className="row-card" style={{ boxShadow: 'none', padding: 0, margin: 0 }}>
            <span className="initials green">{lead.initials}</span>
            <div className="grow">
              <div className="title">{lead.name}</div>
              <div className="sub">Interested: {lead.product} · ₹{lead.price.toLocaleString('en-IN')}</div>
            </div>
            <span className="sla">{lead.slaLeft}</span>
          </div>
          <div className="next-action"><ClipboardList size={12} /> {lead.nextAction}</div>
          <div className="icp">
            <Target size={13} color="#dc2626" />ICP
            <div className="bar"><i style={{ width: `${lead.icp}%` }} /></div>
            <b>{lead.icp}%</b>
          </div>
          <div className="intent"><span><Target size={12} /> Lead Intent Score</span><span>{lead.intent}</span></div>

          <Fold title="ICP FIT BREAKDOWN">
            {lead.icpBreakdown.map((b) => (
              <div key={b.label}>
                <div className="sub" style={{ display: 'flex', justifyContent: 'space-between' }}><span>{b.label}</span><b>{b.value}%</b></div>
                <div className="bar"><i style={{ width: `${b.value}%` }} /></div>
              </div>
            ))}
          </Fold>
          <Fold title="HOW WE GOT HERE" tone="purple">
            <ol>{lead.history.map((h) => <li key={h}>{h}</li>)}</ol>
          </Fold>
          <Fold title={<><ClipboardList size={12} /> WHERE WE PICKED UP SIGNALS</>} tone="amber" defaultOpen>
            {lead.signals.map((s) => (
              <div className="signal" key={s.title}>
                <b>{SIGNAL_ICON[s.kind]}{s.title}</b>
                <p>{s.note}</p>
              </div>
            ))}
          </Fold>
        </div>

        {lead.missed > 0 && (
          <div className="missed-foot">● CUMULATIVE MISSED: {lead.missed} <span>· expired without close, visible to manager</span></div>
        )}
      </div>
    </div>
  )
}
