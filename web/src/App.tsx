import { Route, Routes } from 'react-router-dom'
import Shell from './components/Shell'
import { CallProvider } from './calling/CallContext'
import Dashboard from './pages/Dashboard'
import CallsToMake from './pages/CallsToMake'
import Incoming from './pages/Incoming'
import Recent from './pages/Recent'
import Practise from './pages/Practise'
import Calendar from './pages/Calendar'
import PulseHome from './pages/PulseHome'
import Channel from './pages/Channel'
import Softphone from './pages/Softphone'

export default function App() {
  return (
    <Routes>
      <Route path="/phone" element={<Softphone />} />
      <Route element={<CallProvider><Shell /></CallProvider>}>
        <Route index element={<Dashboard />} />
        <Route path="plan/calls" element={<CallsToMake />} />
        <Route path="plan/incoming" element={<Incoming />} />
        <Route path="plan/recent" element={<Recent />} />
        <Route path="plan/practise" element={<Practise />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="pulse" element={<PulseHome />} />
        <Route path="pulse/:id" element={<Channel />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}
