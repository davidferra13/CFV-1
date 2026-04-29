export const CONTEXT_PANEL_ROUTE_FAMILIES = ['event', 'client', 'activity'] as const

export type ContextPanelRouteFamily = (typeof CONTEXT_PANEL_ROUTE_FAMILIES)[number]

export const CONTEXT_PANEL_STORAGE_PREFIX = 'cf:platform-shell:right-panel'

export function isContextPanelRouteFamily(value: string): value is ContextPanelRouteFamily {
  return CONTEXT_PANEL_ROUTE_FAMILIES.includes(value as ContextPanelRouteFamily)
}

export function getContextPanelStorageKey(family: ContextPanelRouteFamily): string {
  return `${CONTEXT_PANEL_STORAGE_PREFIX}:${family}`
}

export function resolveContextPanelRouteFamily(pathname: string): ContextPanelRouteFamily | null {
  if (pathname === '/activity' || pathname.startsWith('/activity?')) return 'activity'
  if (/^\/events\/[^/]+/.test(pathname)) return 'event'
  if (/^\/clients\/[^/]+/.test(pathname)) return 'client'
  return null
}

export function isContextPanelSupportedPath(pathname: string): boolean {
  return resolveContextPanelRouteFamily(pathname) !== null
}
