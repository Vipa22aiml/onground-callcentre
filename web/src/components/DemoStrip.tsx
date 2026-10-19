import { useState } from 'react'
import { Phone, PhoneCall, ShieldCheck } from 'lucide-react'
import { useCalls } from '../calling/useCalls'
import { roomCode } from '../calling/peerCall'
import leadsData from '../data/leads.json'
import type { Lead } from '../types'

const mukunda = (leadsData as Lead[])[0]

/** The mock's DEMO pill: "In-app call" = human-to-human, "Phone call" = AI tele-caller rings you. */
export default function DemoStrip() {
  const { callHuman, startAi } = useCalls()
  const [help, setHelp] = useState(false)
  const phoneUrl = `${location.origin}/phone?c=${roomCode()}`

  return (
    <>
      {help && (
        <div className="help-pop">
          <b>How calling works</b>
          <span><b>In-app call</b> (human to human): open the customer softphone on another device or tab, then press In-app call or Call back.</span>
          <code>{phoneUrl}</code>
          <span>The softphone can also call this desk, which rings here with Answer/Decline.</span>
          <span><b>Phone call</b> (AI to human): Avani, the AI tele-caller, calls you in the browser. Speak English or Hindi.</span>
        </div>
      )}
      <div className="demo-strip">
        <span className="tag">DEMO</span>
        <button onClick={() => callHuman({ name: 'Customer softphone' })}><Phone size={12} />In-app call</button>
        <button onClick={() => startAi('telecaller', mukunda)}><PhoneCall size={12} />Phone call</button>
        <button className="shield" aria-label="How calling works" aria-expanded={help} onClick={() => setHelp(!help)}>
          <ShieldCheck size={13} />
        </button>
      </div>
    </>
  )
}
