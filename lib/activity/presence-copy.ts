export const ACTIVE_CLIENT_SIGNAL_WINDOW_MINUTES = 5
export const ACTIVE_CLIENT_SIGNAL_WINDOW_MS = ACTIVE_CLIENT_SIGNAL_WINDOW_MINUTES * 60 * 1000

export function isActiveClientSignal(lastActivity: string, nowMs = Date.now()): boolean {
  const activityMs = new Date(lastActivity).getTime()
  if (!Number.isFinite(activityMs)) return false
  return nowMs - activityMs < ACTIVE_CLIENT_SIGNAL_WINDOW_MS
}

export function formatActivityWindowLabel(minutes: number): string {
  if (minutes === 1) return 'last minute'
  if (minutes === 60) return 'last hour'
  if (minutes % 60 === 0) return `last ${minutes / 60} hours`
  return `last ${minutes} minutes`
}

export function formatActivitySignalAge(dateStr: string, nowMs = Date.now()): string {
  const activityMs = new Date(dateStr).getTime()
  if (!Number.isFinite(activityMs)) return 'unknown'

  const diffMs = Math.max(0, nowMs - activityMs)
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins === 1) return '1m ago'
  if (mins < 60) return `${mins}m ago`

  const hrs = Math.floor(diffMs / 3600000)
  if (hrs === 1) return '1h ago'
  if (hrs < 24) return `${hrs}h ago`

  return `${Math.floor(diffMs / 86400000)}d ago`
}

export function getActiveSignalExplanation(): string {
  return `Inferred from client portal events in the ${formatActivityWindowLabel(
    ACTIVE_CLIENT_SIGNAL_WINDOW_MINUTES
  )}, not a guaranteed live connection.`
}
