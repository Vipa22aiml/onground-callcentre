import { useRef, useState } from 'react'
import { startAiCall, type Line } from './calling/aiCall'

export default function App() {
  const [status, setStatus] = useState('idle')
  const [lines, setLines] = useState<Line[]>([])
  const hangup = useRef<() => void>(undefined)
  return (
    <div style={{ padding: 24 }}>
      <p id="status">{status}</p>
      <button id="start" onClick={async () => { hangup.current = await startAiCall('telecaller', 'Mukunda', { onLine: (l) => setLines((x) => [...x, l]), onStatus: setStatus }) }}>Call</button>
      <button id="end" onClick={() => hangup.current?.()}>End</button>
      <ul id="lines">{lines.map((l, i) => <li key={i}>{l.who}: {l.text}</li>)}</ul>
    </div>
  )
}
