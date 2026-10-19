import { Phone, PhoneMissed } from 'lucide-react'
import missedData from '../data/missed.json'
import leadsData from '../data/leads.json'
import PlannerHead from '../components/PlannerHead'
import { useCalls } from '../calling/useCalls'
import type { Lead, MissedCall } from '../types'

const missed = [...(missedData as MissedCall[])].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
const atStake = missed.reduce((sum, m) => sum + (m.value ?? 0), 0)
const leadFor = (name: string) => (leadsData as Lead[]).find((l) => l.name === name) ?? { name }
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

export default function Incoming() {
  const { callHuman } = useCalls()
  return (
    <>
      <PlannerHead />
      <div className="pad">
        <div className="list-head">
          <h2>Missed calls</h2>
          <div className="sub">Ranked by expected value — call the highest-value leads back first</div>
        </div>
        <div className="stake">
          <div><b>{missed.length}</b><span>Missed today</span></div>
          <div><b className="money">{inr(atStake)}</b><span>Expected value at stake</span></div>
        </div>
        {missed.map((m) => (
          <div className="row-card" key={m.id}>
            <span className="call-ico missed"><PhoneMissed size={14} /></span>
            <div className="grow">
              <div className="title">{m.name}</div>
              <div className="sub">{m.when} · {m.context}</div>
            </div>
            <div className="value">
              {m.value ? <b>{inr(m.value)} expected</b> : <small>New contact</small>}
              <button className="btn primary small" onClick={() => callHuman(leadFor(m.name))}><Phone size={11} />Call back</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
