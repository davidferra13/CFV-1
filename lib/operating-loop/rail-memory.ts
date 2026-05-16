import type { GodModeResolvedItem } from '@/lib/discovery/god-mode-types'
import type { LoopState, WaitingOn } from './types'

const LOOP_STATE_LABEL: Record<LoopState, string> = {
  active: 'Active',
  waiting: 'Waiting',
  blocked: 'Blocked',
  stale: 'Stale',
  done: 'Done',
  dismissed: 'Dismissed',
  snoozed: 'Snoozed',
  uncertain: 'Uncertain',
}

export function getLoopStateLabel(state: LoopState | null | undefined): string | null {
  return state ? (LOOP_STATE_LABEL[state] ?? state) : null
}

export function formatFollowUpAt(
  value: string | null | undefined,
  now: Date = new Date()
): string | null {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((target - today) / 86_400_000)

  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days <= 7) return `in ${days}d`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatWaitingOn(
  waitingOn: WaitingOn | null | undefined,
  now?: Date
): string | null {
  if (!waitingOn) return null
  const followUp = formatFollowUpAt(waitingOn.followUpAt, now)
  return followUp
    ? `Waiting on ${waitingOn.label}, follow up ${followUp}`
    : `Waiting on ${waitingOn.label}`
}

export function formatRailMemoryLine(
  item: Pick<GodModeResolvedItem, 'context' | 'loopState' | 'nextAction' | 'waitingOn'>,
  now?: Date
): string | null {
  const parts = [
    getLoopStateLabel(item.loopState),
    formatWaitingOn(item.waitingOn, now),
    item.nextAction ?? item.context,
  ].filter((part): part is string => Boolean(part && part.trim().length > 0))

  if (parts.length === 0) return null
  return [...new Set(parts)].join(' / ')
}
