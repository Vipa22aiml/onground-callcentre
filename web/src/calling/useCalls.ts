import { createContext, useContext } from 'react'
import type { MediaConnection } from 'peerjs'
import type { CallSummary, Line, RecentCall } from '../types'
import type { CallTarget, Persona } from './aiCall'

export type CallKind = 'ai' | 'human' | 'practice'
export type ActiveCall = CallTarget & {
  kind: CallKind
  direction: 'outgoing' | 'incoming'
  status: 'connecting' | 'ringing' | 'live' | 'ended' | 'failed'
  lines: Line[]
  startedAt?: number
  muted: boolean
  speaking: 'you' | 'ai' | 'thinking' | null
  summary?: CallSummary | 'loading' | 'failed'
  error?: string
}

export type CallApi = {
  active: ActiveCall | null
  incoming: MediaConnection | null
  log: RecentCall[]
  startAi: (persona: Persona, target: CallTarget) => void
  callHuman: (target: CallTarget) => void
  acceptIncoming: () => void
  rejectIncoming: () => void
  hangup: () => void
  toggleMute: () => void
}

export const CallCtx = createContext<CallApi | null>(null)

export const useCalls = () => {
  const api = useContext(CallCtx)
  if (!api) throw new Error('useCalls must be used inside <CallProvider>')
  return api
}
