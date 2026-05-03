'use server'

// Unified Alert Hub
// Aggregates alerts from all domain-specific sources into a single
// priority-sorted feed. Each source is non-blocking; a failed source
// returns zero alerts rather than breaking the hub.

import { requireChef } from '@/lib/auth/get-user'

export type UnifiedAlert = {
  id: string
  source: 'dietary' | 'birthday' | 'cooling' | 'touchpoint'
  severity: 'critical' | 'warning' | 'info'
  title: string
  body: string
  clientId?: string
  clientName?: string
  actionUrl?: string
  createdAt: string
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 }

export async function getUnifiedAlerts(limit = 25): Promise<UnifiedAlert[]> {
  const user = await requireChef()
  const alerts: UnifiedAlert[] = []

  // Dietary alerts
  try {
    const { getDietaryAlerts } = await import('@/lib/clients/dietary-alert-actions')
    const dietaryAlerts = await getDietaryAlerts(true)
    for (const a of dietaryAlerts.slice(0, 10)) {
      alerts.push({
        id: `dietary-${a.id}`,
        source: 'dietary',
        severity: a.severity === 'critical' ? 'critical' : 'warning',
        title: a.title ?? 'Dietary change detected',
        body: a.description ?? a.change_summary ?? '',
        clientId: a.client_id,
        clientName: a.client_name ?? undefined,
        actionUrl: a.client_id ? `/clients/${a.client_id}` : undefined,
        createdAt: a.created_at,
      })
    }
  } catch (err) {
    console.error('[alert-hub] dietary source failed (non-blocking):', err)
  }

  // Birthday / milestone alerts
  try {
    const { getUpcomingMilestones } = await import('@/lib/clients/birthday-alerts')
    const milestones = await getUpcomingMilestones(14)
    for (const m of milestones.slice(0, 10)) {
      alerts.push({
        id: `birthday-${m.clientId}-${m.milestoneDate}`,
        source: 'birthday',
        severity: 'info',
        title: m.label ?? 'Upcoming milestone',
        body: m.description ?? '',
        clientId: m.clientId,
        clientName: m.clientName ?? undefined,
        actionUrl: `/clients/${m.clientId}`,
        createdAt: m.milestoneDate ?? new Date().toISOString(),
      })
    }
  } catch (err) {
    console.error('[alert-hub] birthday source failed (non-blocking):', err)
  }

  // Cooling relationship alerts
  try {
    const { findCoolingClients } = await import('@/lib/clients/cooling-alert')
    const cooling = await (findCoolingClients as any)()
    if (Array.isArray(cooling)) {
      for (const c of cooling.slice(0, 10)) {
        alerts.push({
          id: `cooling-${c.clientId ?? c.id}`,
          source: 'cooling',
          severity: 'warning',
          title: `${c.clientName ?? c.full_name ?? 'Client'} may be going cold`,
          body: c.reason ?? `No contact in ${c.daysSinceLastEvent ?? '?'} days`,
          clientId: c.clientId ?? c.id,
          clientName: c.clientName ?? c.full_name ?? undefined,
          actionUrl: `/clients/${c.clientId ?? c.id}`,
          createdAt: new Date().toISOString(),
        })
      }
    }
  } catch (err) {
    console.error('[alert-hub] cooling source failed (non-blocking):', err)
  }

  // Sort by severity then recency
  alerts.sort((a, b) => {
    const sevDiff = (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2)
    if (sevDiff !== 0) return sevDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return alerts.slice(0, limit)
}

export async function getAlertCounts(): Promise<Record<UnifiedAlert['source'], number>> {
  const alerts = await getUnifiedAlerts(100)
  const counts: Record<string, number> = { dietary: 0, birthday: 0, cooling: 0, touchpoint: 0 }
  for (const a of alerts) {
    counts[a.source] = (counts[a.source] ?? 0) + 1
  }
  return counts as Record<UnifiedAlert['source'], number>
}
