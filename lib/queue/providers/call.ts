// Priority Queue - Call Provider
// Surfaces logged call follow-ups so promised next actions do not stay buried on call detail pages.

import type { QueueItem, ScoreInputs } from '../types'
import { computeScore, urgencyFromScore } from '../score'

type CallQueueRow = {
  id: string
  title: string | null
  call_type: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled'
  scheduled_at: string | null
  next_action: string | null
  next_action_due_at: string | null
  created_at: string | null
  updated_at: string | null
  client?: { full_name?: string | null } | null
  event?: { occasion?: string | null; event_date?: string | null } | null
  inquiry?: { confirmed_occasion?: string | null } | null
}

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Due date set'
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function callContext(call: CallQueueRow): string {
  return (
    cleanText(call.client?.full_name) ??
    cleanText(call.event?.occasion) ??
    cleanText(call.inquiry?.confirmed_occasion) ??
    cleanText(call.title) ??
    'Call follow-up'
  )
}

function parseDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function callTypeLabel(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function buildCallQueueItem(call: CallQueueRow, now: Date = new Date()): QueueItem {
  const dueAt = parseDateOrNull(call.next_action_due_at)
  const hoursUntilDue = dueAt ? (dueAt.getTime() - now.getTime()) / 3600000 : null
  const createdAt = parseDateOrNull(call.updated_at ?? call.created_at ?? call.scheduled_at) ?? now
  const hoursSinceCreated = Math.max(0, (now.getTime() - createdAt.getTime()) / 3600000)
  const action = cleanText(call.next_action) ?? 'Complete the promised call follow-up.'
  const overdue = typeof hoursUntilDue === 'number' && hoursUntilDue < 0
  const scoreInputs: ScoreInputs = {
    hoursUntilDue,
    impactWeight: overdue ? 0.75 : 0.55,
    isBlocking: overdue,
    hoursSinceCreated,
    revenueCents: 0,
    isExpiring: typeof hoursUntilDue === 'number' && hoursUntilDue <= 24,
  }
  const score = computeScore(scoreInputs)
  const context = callContext(call)

  return {
    id: `client:scheduled_call:${call.id}:next_action`,
    domain: 'client',
    urgency: overdue ? 'critical' : urgencyFromScore(score),
    score,
    title: `Call follow-up: ${action}`,
    description: overdue
      ? 'This promised call follow-up is overdue. Open the call and resolve the next action.'
      : 'This call has a promised next action. Open the call and move the relationship forward.',
    href: `/calls/${call.id}`,
    icon: 'PhoneCall',
    context: {
      primaryLabel: context,
      secondaryLabel: call.next_action_due_at
        ? `${overdue ? 'Overdue' : 'Due'} ${formatDate(call.next_action_due_at)}`
        : callTypeLabel(call.call_type),
    },
    createdAt: createdAt.toISOString(),
    dueAt: dueAt ? dueAt.toISOString() : null,
    blocks: overdue ? 'Client follow-up' : undefined,
    entityId: call.id,
    entityType: 'scheduled_call',
    estimatedMinutes: 10,
    contextLine: `Call status: ${call.status}`,
  }
}

export async function getCallQueueItems(db: any, tenantId: string): Promise<QueueItem[]> {
  const now = new Date()
  const { data, error } = await db
    .from('scheduled_calls')
    .select(
      `
      id, title, call_type, status, scheduled_at, next_action, next_action_due_at, created_at, updated_at,
      client:clients(full_name),
      event:events(occasion, event_date),
      inquiry:inquiries(confirmed_occasion)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .not('next_action', 'is', null)
    .order('next_action_due_at', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(25)

  if (error) {
    console.error('[Queue] Call provider failed:', error)
    return []
  }

  return ((data ?? []) as CallQueueRow[])
    .filter((call) => cleanText(call.next_action))
    .map((call) => buildCallQueueItem(call, now))
}
