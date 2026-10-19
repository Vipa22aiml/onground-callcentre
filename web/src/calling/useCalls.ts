import { createContext, useContext } from 'react'
import type { MediaConnection } from 'peerjs'
import type { Line, RecentCall } from '../types'
import type { Persona } from './aiCall'

export type CallKind = 'ai' | 'human' | 'practice'
export type ActiveCall = {
  name: string
  kind: CallKind
  direction: 'outgoing' | 'incoming'
  status: 'connecting' | 'ringing' | 'live' | 'ended' | 'failed'
  lines: Line[]
  startedAt?: number
  muted: boolean
  error?: string
}

export type CallApi = {
  active: ActiveCall | null
  incoming: MediaConnection | null
  log: RecentCall[]
  startAi: (persona: Persona, name: string) => void
  callHuman: (name: string) => void
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
