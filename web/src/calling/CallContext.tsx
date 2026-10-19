import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type Peer from 'peerjs'
import type { MediaConnection } from 'peerjs'
import type { RecentCall } from '../types'
import { CallCtx, type ActiveCall, type CallApi } from './useCalls'
import { CALL_SERVER, startAiCall, summarize } from './aiCall'
import { answer, dial, openLine, peerId } from './peerCall'

const fmtDuration = (ms: number) => `${Math.floor(ms / 60000)}m ${String(Math.round(ms / 1000) % 60).padStart(2, '0')}s`
const nowLabel = () => new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

export function CallProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveCall | null>(null)
  const [incoming, setIncoming] = useState<MediaConnection | null>(null)
  const [log, setLog] = useState<RecentCall[]>([])
  const peer = useRef<Peer | null>(null)
  const controls = useRef<{ end: () => void; mute?: (on: boolean) => void } | null>(null)
  const activeRef = useRef<ActiveCall | null>(null)
  useEffect(() => {
    activeRef.current = active
  }, [active])

  const update = (patch: Partial<ActiveCall>) => setActive((a) => (a ? { ...a, ...patch } : a))

  // A call ended (either side): log it. AI calls with a transcript stay open to show the AI
  // summary; other calls clear the call panel after a moment.
  const finish = useCallback(() => {
    const a = activeRef.current
    controls.current = null
    if (!a || a.status === 'ended') return
    activeRef.current = { ...a, status: 'ended' } // several end events can fire in one tick; log once
    if (a.status === 'failed') return setActive(null)

    const id = `c${Date.now()}`
    setLog((l) => [
      {
        id,
        name: a.kind === 'practice' ? `Practice: ${a.name}` : a.name,
        when: `Today ${nowLabel()}`,
        duration: a.startedAt ? fmtDuration(Date.now() - a.startedAt) : null,
        type: a.startedAt ? a.direction : 'missed',
        kind: a.kind,
        transcript: a.lines,
      },
      ...l,
    ])
    update({ status: 'ended', speaking: null })

    if (a.kind === 'human' || a.lines.length === 0) {
      setTimeout(() => setActive((x) => (x?.status === 'ended' ? null : x)), 1500)
      return
    }
    update({ summary: 'loading' })
    summarize(a.name, a.kind === 'practice' ? 'practice' : 'AI tele-caller', a.lines)
      .then((summary) => {
        update({ summary })
        setLog((l) => l.map((c) => (c.id === id ? { ...c, summary } : c)))
      })
      .catch(() => update({ summary: 'failed' }))
  }, [])

  // Free hosting sleeps when idle; wake the call server as soon as the app opens.
  useEffect(() => {
    fetch(CALL_SERVER).catch(() => {})
  }, [])

  useEffect(() => {
    // Deferred a tick so React StrictMode's mount/unmount/mount doesn't register the peer id twice.
    const t = setTimeout(() => {
      peer.current = openLine('agent', setIncoming, (error) => update({ status: 'failed', error }))
    })
    return () => {
      clearTimeout(t)
      peer.current?.destroy()
    }
  }, [])

  const begin = (call: Omit<ActiveCall, 'lines' | 'muted' | 'speaking'>) => {
    controls.current?.end()
    setActive({ ...call, lines: [], muted: false, speaking: null })
  }

  const fail = (e: unknown) => update({ status: 'failed', error: e instanceof Error ? e.message : String(e) })

  const api: CallApi = {
    active,
    incoming,
    log,
    startAi: (persona, target) => {
      begin({ ...target, kind: persona === 'shopper' ? 'practice' : 'ai', direction: 'outgoing', status: 'connecting' })
      startAiCall(persona, target, {
        onLine: (line) => setActive((a) => (a ? { ...a, lines: [...a.lines, line] } : a)),
        onStatus: (s) => (s === 'live' ? update({ status: 'live', startedAt: Date.now() }) : s === 'ended' && finish()),
        onSpeaking: (speaking) => update({ speaking }),
      })
        .then((c) => (controls.current = c))
        .catch(fail)
    },
    callHuman: (target) => {
      if (!peer.current) return
      begin({ ...target, kind: 'human', direction: 'outgoing', status: 'ringing' })
      dial(peer.current, peerId('phone'), finish)
        .then((c) => {
          controls.current = c
          c.call.on('stream', () => update({ status: 'live', startedAt: Date.now() }))
        })
        .catch(fail)
    },
    acceptIncoming: () => {
      const call = incoming
      if (!call) return
      setIncoming(null)
      begin({ name: 'Customer softphone', kind: 'human', direction: 'incoming', status: 'connecting' })
      answer(call, finish)
        .then((c) => {
          controls.current = c
          update({ status: 'live', startedAt: Date.now() })
        })
        .catch(fail)
    },
    rejectIncoming: () => {
      incoming?.close()
      setIncoming(null)
    },
    hangup: () => {
      if (activeRef.current?.status === 'ended') return setActive(null) // closing the summary card
      if (controls.current) controls.current.end()
      else setActive(null)
      finish()
    },
    toggleMute: () => {
      const muted = !activeRef.current?.muted
      controls.current?.mute?.(muted)
      update({ muted })
    },
  }

  return <CallCtx.Provider value={api}>{children}</CallCtx.Provider>
}
