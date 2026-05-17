// Waiting State Command Surface - Types
// Lifecycle #8: tracks what is being waited on, who owns it, escalation, nudges, timeouts

export type WaitingReason =
  | 'client-response'
  | 'payment'
  | 'approval'
  | 'scheduling'
  | 'vendor'
  | 'internal'
  | 'custom'

export type TimeoutAction = 'nudge' | 'escalate' | 'auto-close' | 'notify-chef'

export type NudgeChannel = 'sms' | 'email' | 'portal'

export interface WaitingStateEntry {
  id: string
  tenantId: string
  eventId: string | null
  lifecycleStage: string
  reason: WaitingReason
  waitingOn: string
  description: string | null
  startedAt: Date
  resolvedAt: Date | null
  escalationLevel: number
  lastNudgeAt: Date | null
  timeoutAt: Date | null
  timeoutAction: TimeoutAction | null
  createdAt: Date
}

export interface NudgeTemplate {
  id: string
  tenantId: string
  reason: WaitingReason
  channel: NudgeChannel
  templateText: string
  delayDays: number
  createdAt: Date
}

export interface WaitingStateSummary {
  totalWaiting: number
  resolvedCount: number
  avgWaitDays: number
  overdueCount: number
  byReason: Record<WaitingReason, number>
}
