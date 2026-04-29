import { recordRefreshTelemetry } from '@/lib/runtime/refresh-telemetry'

type RefreshRouter = {
  refresh: () => void
}

export type TrackedRouterRefreshInput = {
  pathname?: string | null
  source: string
  entity?: string | null
  event?: string | null
  reason?: string | null
}

function currentBrowserPathname(): string {
  if (typeof window === 'undefined') {
    return 'unknown'
  }

  return window.location.pathname || 'unknown'
}

export function trackedRouterRefresh(
  router: RefreshRouter,
  input: TrackedRouterRefreshInput,
): void {
  recordRefreshTelemetry({
    kind: 'refresh',
    pathname: input.pathname || currentBrowserPathname(),
    source: input.source,
    entity: input.entity,
    event: input.event,
    reason: input.reason,
  })

  router.refresh()
}
