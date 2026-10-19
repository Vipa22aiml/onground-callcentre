import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bell, Calendar, History, LayoutGrid, Menu, MessagesSquare, Phone, PhoneIncoming, PhoneOutgoing, Star,
} from 'lucide-react'
import dashboard from '../data/dashboard.json'
import CallDock from './CallDock'
import DemoStrip from './DemoStrip'

const planLinks = [
  { to: '/plan/calls', label: 'Calls to make', icon: PhoneOutgoing },
  { to: '/plan/incoming', label: 'Incoming', icon: PhoneIncoming },
  { to: '/plan/recent', label: 'Recent', icon: History },
  { to: '/plan/practise', label: 'Practise a call', icon: PhoneOutgoing },
]

const cls = (on: boolean, base: string) => (on ? `${base} on` : base)

export default function Shell() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { agent } = dashboard
  const close = () => setOpen(false)

  return (
    <div className="shell">
      <nav className={open ? 'side open' : 'side'} onClick={close}>
        <div className="brand">On-Ground.ai</div>
        <NavLink to="/" end className={({ isActive }) => cls(isActive, 'nav-item')}>
          <span className="ico"><LayoutGrid size={14} /></span>Dashboard
        </NavLink>
        <NavLink to="/plan/calls" className={() => cls(pathname.startsWith('/plan'), 'nav-item')} style={{ '--c': '#3b82f6' } as React.CSSProperties}>
          <span className="ico"><Phone size={14} /></span>Plan
        </NavLink>
        {planLinks.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cls(isActive, 'nav-sub')}>
            <Icon size={12} />{label}
          </NavLink>
        ))}
        <NavLink to="/calendar" className={({ isActive }) => cls(isActive, 'nav-item')} style={{ '--c': '#d97706' } as React.CSSProperties}>
          <span className="ico"><Calendar size={14} /></span>Calendar
        </NavLink>
        <NavLink to="/pulse" className={({ isActive }) => cls(isActive, 'nav-item')} style={{ '--c': '#7c3aed' } as React.CSSProperties}>
          <span className="ico"><MessagesSquare size={14} /></span>Pulse
        </NavLink>
      </nav>

      <div className="main">
        <header className="topbar">
          <div className="logo">
            <button className="burger" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={18} /></button>
            <span className="og">OG</span>On-Ground.ai
          </div>
          <div className="right">
            <span className="bell" title="Notifications"><Bell size={14} /></span>
            <span className="score-pill" title={`OG Score ${agent.score}, rank #${agent.rank}`}>
              <span className="score-ring">{agent.score}</span><Star size={11} fill="currentColor" />#{agent.rank}
            </span>
            <span className="avatar" title={agent.name}>{agent.initials}</span>
          </div>
        </header>
        <main className={pathname.startsWith('/pulse/') ? 'page fill' : 'page'}>
          <Outlet />
        </main>
      </div>

      <DemoStrip />
      <CallDock />
    </div>
  )
}
