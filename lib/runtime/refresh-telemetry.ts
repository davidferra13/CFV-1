export type RefreshTelemetryEvent = {
  kind: 'refresh' | 'skip'
  pathname: string
  source: string
  entity?: string | null
  event?: string | null
  reason?: string | null
  occurredAt: number
}

export type RefreshTelemetrySnapshot = {
  events: RefreshTelemetryEvent[]
  totalRefreshes: number
  totalSkips: number
  recentRefreshes: number
  recentSkips: number
}

const MAX_EVENTS = 50
const RECENT_WINDOW_MS = 60_000

const events: RefreshTelemetryEvent[] = []
const listeners = new Set<() => void>()

function telemetryEnabled(): boolean {
  return typeof process === 'undefined' || process.env?.NODE_ENV !== 'production'
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function recordRefreshTelemetry(
  input: Omit<RefreshTelemetryEvent, 'occurredAt'>,
): void {
  if (!telemetryEnabled()) {
    return
  }

  events.push({
    ...input,
    occurredAt: Date.now(),
  })

  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS)
  }

  notifyListeners()
}

export function getRefreshTelemetrySnapshot(): RefreshTelemetrySnapshot {
  const recentCutoff = Date.now() - RECENT_WINDOW_MS
  let totalRefreshes = 0
  let totalSkips = 0
  let recentRefreshes = 0
  let recentSkips = 0

  for (const event of events) {
    if (event.kind === 'refresh') {
      totalRefreshes += 1

      if (event.occurredAt >= recentCutoff) {
        recentRefreshes += 1
      }
    } else {
      totalSkips += 1

      if (event.occurredAt >= recentCutoff) {
        recentSkips += 1
      }
    }
  }

  return {
    events: [...events],
    totalRefreshes,
    totalSkips,
    recentRefreshes,
    recentSkips,
  }
}

export function subscribeRefreshTelemetry(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function clearRefreshTelemetry(): void {
  if (events.length === 0) {
    return
  }

  events.length = 0
  notifyListeners()
}
