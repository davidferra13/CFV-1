import type { ClientDashboardWidgetPreference } from '@/lib/client-dashboard/types'
import {
  CLIENT_DASHBOARD_WIDGET_IDS,
  DEFAULT_CLIENT_DASHBOARD_WIDGETS,
} from '@/lib/client-dashboard/types'

const VALID_WIDGET_IDS = new Set<string>(CLIENT_DASHBOARD_WIDGET_IDS)

export function cloneDefaultClientDashboardWidgets(): ClientDashboardWidgetPreference[] {
  return DEFAULT_CLIENT_DASHBOARD_WIDGETS.map((widget) => ({ ...widget }))
}

export function sanitizeClientDashboardWidgets(
  input: ClientDashboardWidgetPreference[]
): ClientDashboardWidgetPreference[] {
  const seen = new Set<ClientDashboardWidgetPreference['id']>()
  const ordered: ClientDashboardWidgetPreference[] = []

  for (const widget of input) {
    if (seen.has(widget.id)) continue
    seen.add(widget.id)
    ordered.push({ id: widget.id, enabled: widget.enabled })
  }

  for (const fallbackWidget of DEFAULT_CLIENT_DASHBOARD_WIDGETS) {
    if (seen.has(fallbackWidget.id)) continue
    ordered.push({ ...fallbackWidget })
  }

  return ordered
}

export function getClientDashboardWidgetsFromUnknown(
  value: unknown
): ClientDashboardWidgetPreference[] {
  if (!Array.isArray(value)) return cloneDefaultClientDashboardWidgets()

  const candidates: ClientDashboardWidgetPreference[] = []
  for (const row of value) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const id = item.id
    const enabled = item.enabled
    if (typeof id !== 'string' || !VALID_WIDGET_IDS.has(id)) continue
    if (typeof enabled !== 'boolean') continue
    candidates.push({ id: id as ClientDashboardWidgetPreference['id'], enabled })
  }

  if (candidates.length === 0) return cloneDefaultClientDashboardWidgets()
  return sanitizeClientDashboardWidgets(candidates)
}
