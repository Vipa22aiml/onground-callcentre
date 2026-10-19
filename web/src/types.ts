export type Signal = { kind: 'financing' | 'quotation' | 'warranty' | 'delivery'; title: string; note: string }

export type Lead = {
  id: string
  name: string
  initials: string
  product: string
  price: number
  score: number
  icp: number
  intent: number
  slaLeft: string
  nextAction: string
  icpBreakdown: { label: string; value: number }[]
  history: string[]
  signals: Signal[]
  missed: number
}

export type MissedCall = {
  id: string
  name: string
  when: string
  context: string
  value: number | null
}

export type Line = { who: 'you' | 'ai' | 'them'; text: string }

export type CallSummary = {
  summary: string
  outcome: string
  next_step: string
  sentiment: 'positive' | 'neutral' | 'negative'
}

export type RecentCall = {
  id: string
  name: string
  when: string
  duration: string | null
  type: 'outgoing' | 'incoming' | 'missed'
  kind?: 'ai' | 'human' | 'practice'
  transcript?: Line[]
  sop?: { item: string; done: boolean }[]
  summary?: CallSummary
}

export type CalEvent = { date: string; time: string; title: string; kind: 'visit' | 'coaching' | 'meeting' }

export type Agent = {
  id: string
  name: string
  subtitle: string
  group: 'role' | 'task'
  color: string
  metric?: string
  unread?: number
}

export type Message = { id: string; author: string; initials: string; time: string; text: string; mine?: boolean }
