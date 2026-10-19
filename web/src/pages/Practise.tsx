import { Bot, Mic } from 'lucide-react'
import PlannerHead from '../components/PlannerHead'
import leadsData from '../data/leads.json'
import { useCalls } from '../calling/useCalls'
import type { Lead } from '../types'

const mukunda = (leadsData as Lead[])[0]

export default function Practise() {
  const { startAi, active } = useCalls()
  return (
    <>
      <PlannerHead />
      <div className="pad practise">
        <div className="list-head">
          <h2>Practise a call</h2>
          <div className="sub">Rehearse a callback with an AI shopper before you dial the real one</div>
        </div>
        <div className="card persona">
          <div className="row-card" style={{ boxShadow: 'none', padding: 0, margin: 0 }}>
            <span className="initials green">MK</span>
            <div className="grow">
              <div className="title">Mukunda (AI shopper)</div>
              <div className="sub">Looked at Ortho GRID · ₹8,490 · price-sensitive</div>
            </div>
          </div>
          <ul>
            <li>Will ask about EMI and quote a cheaper competitor.</li>
            <li>Agrees to visit only if you handle the objections well.</li>
            <li>Speaks English or Hindi — reply in either.</li>
          </ul>
          <div>
            <button className="btn purple" disabled={!!active} onClick={() => startAi('shopper', mukunda)}>
              <Mic size={13} />Start practice call
            </button>
          </div>
        </div>
        <div className="sub"><Bot size={11} /> Voice: Sarvam Saarika (speech-to-text) and Bulbul (text-to-speech), replies by Gemini, streamed with Pipecat. The transcript is saved to Recent.</div>
      </div>
    </>
  )
}
