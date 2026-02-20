// Lightweight structured logging + in-memory counters for activity subsystem.

type MetricName =
  | 'activity.track.success'
  | 'activity.track.failure'
  | 'activity.track.invalid_payload'
  | 'activity.track.unauthorized'
  | 'activity.feed.query_failure'

const counters = new Map<MetricName, number>()

export function incrementMetric(metric: MetricName, by = 1): void {
  counters.set(metric, (counters.get(metric) || 0) + by)
}

export function getMetric(metric: MetricName): number {
  return counters.get(metric) || 0
}

export function logActivityEvent(
  level: 'info' | 'warn' | 'error',
  message: string,
  context: Record<string, unknown> = {}
): void {
  const payload = {
    scope: 'activity',
    level,
    message,
    context,
    at: new Date().toISOString(),
  }

  if (level === 'error') {
    console.error(payload)
    return
  }
  if (level === 'warn') {
    console.warn(payload)
    return
  }
  console.log(payload)
}
