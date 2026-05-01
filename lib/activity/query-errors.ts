import { incrementMetric, logActivityEvent } from './observability'

export function failActivityQuery(
  source: string,
  error: unknown,
  context?: Record<string, unknown>
): never {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? 'Unknown activity query failure')
      : 'Unknown activity query failure'

  incrementMetric('activity.feed.query_failure')
  logActivityEvent('error', `${source} failed`, { error: message, ...context })

  throw new Error(`${source} failed`)
}
