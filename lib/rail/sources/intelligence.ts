import type { RailItem, RailTier } from '@/lib/rail/types'

const MAX_ITEMS = 8

function makeTier(severity: string): RailTier {
  switch (severity) {
    case 'critical':
    case 'urgent':
      return 'critical'
    case 'warning':
    case 'high':
      return 'action'
    case 'info':
    case 'moderate':
    case 'medium':
      return 'awareness'
    case 'low':
    case 'opportunity':
      return 'opportunity'
    default:
      return 'awareness'
  }
}

function makeScore(severity: string, fallback: number): number {
  switch (severity) {
    case 'critical':
    case 'urgent':
      return 100
    case 'warning':
    case 'high':
      return 75
    case 'info':
    case 'moderate':
    case 'medium':
      return 50
    case 'low':
    case 'opportunity':
      return 25
    default:
      return fallback
  }
}

async function fetchAlerts(tenantId: string): Promise<RailItem[]> {
  try {
    const { getProactiveAlerts } = await import('@/lib/intelligence/proactive-alerts')
    const result = await getProactiveAlerts()
    const now = new Date()

    return result.alerts.map((alert) => ({
      id: `intel-alert-${alert.id}`,
      tenantId,
      source: 'intelligence',
      tier: makeTier(alert.severity),
      state: 'surfaced' as const,
      score: makeScore(alert.severity, 50),
      title: alert.title,
      subtitle: alert.detail,
      actionUrl: alert.link ?? '/dashboard',
      createdAt: now,
      surfacedAt: now,
      ttlMinutes: 1440,
      metadata: {
        subSource: 'proactive-alert',
        severity: alert.severity,
      },
    }))
  } catch {
    return []
  }
}

async function fetchChurnSignals(tenantId: string): Promise<RailItem[]> {
  try {
    const { getChurnPreventionTriggers } =
      await import('@/lib/intelligence/churn-prevention-triggers')
    const result = await getChurnPreventionTriggers()
    if (!result) return []
    const now = new Date()

    return result.atRiskClients.slice(0, 3).map((client) => ({
      id: `intel-churn-${client.clientId}`,
      tenantId,
      source: 'intelligence',
      tier: makeTier(client.riskLevel),
      state: 'surfaced' as const,
      score: client.riskScore,
      title: `${client.clientName} at risk`,
      subtitle: client.triggers.map((t) => t.description).join('; ') || 'Engagement declining',
      actionUrl: '/clients',
      createdAt: now,
      surfacedAt: now,
      ttlMinutes: 2880,
      metadata: {
        subSource: 'churn-prevention',
        riskLevel: client.riskLevel,
        daysSinceLastEvent: client.daysSinceLastEvent,
        totalRevenueCents: client.totalRevenueCents,
      },
    }))
  } catch {
    return []
  }
}

async function fetchPostEventSignals(tenantId: string): Promise<RailItem[]> {
  try {
    const { getPostEventTriggers } = await import('@/lib/intelligence/post-event-triggers')
    const result = await getPostEventTriggers()
    if (!result) return []
    const now = new Date()

    return result.tasks
      .filter((t) => t.daysOverdue >= 0)
      .slice(0, 3)
      .map((task) => ({
        id: `intel-post-event-${task.eventId}-${task.taskType}`,
        tenantId,
        source: 'intelligence',
        tier: makeTier(task.priority),
        state: 'surfaced' as const,
        score: task.daysOverdue > 0 ? 70 + Math.min(task.daysOverdue, 30) : 40,
        title: task.title,
        subtitle: `${task.clientName} (${task.daysOverdue > 0 ? `${task.daysOverdue}d overdue` : 'due'})`,
        actionUrl: '/events',
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: 1440,
        metadata: {
          subSource: 'post-event',
          eventId: task.eventId,
          taskType: task.taskType,
          daysOverdue: task.daysOverdue,
        },
      }))
  } catch {
    return []
  }
}

async function fetchTriageSignals(tenantId: string): Promise<RailItem[]> {
  try {
    const { getInquiryTriage } = await import('@/lib/intelligence/inquiry-triage')
    const result = await getInquiryTriage()
    if (!result) return []
    const now = new Date()

    return result.triaged
      .filter((i) => i.priorityLevel === 'urgent' || i.priorityLevel === 'high')
      .slice(0, 3)
      .map((inq) => ({
        id: `intel-triage-${inq.inquiryId}`,
        tenantId,
        source: 'intelligence',
        tier: inq.priorityLevel === 'urgent' ? ('critical' as const) : ('action' as const),
        state: 'surfaced' as const,
        score: inq.priorityScore,
        title: `Triage: ${inq.clientName ?? 'Unknown'}`,
        subtitle: inq.suggestedAction,
        actionUrl: '/inquiries',
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: 720,
        metadata: {
          subSource: 'inquiry-triage',
          inquiryId: inq.inquiryId,
          hoursUnanswered: inq.hoursUnanswered,
          estimatedValueCents: inq.estimatedValueCents,
          hasDateConflict: inq.hasDateConflict,
        },
      }))
  } catch {
    return []
  }
}

export async function getIntelligenceRailItems(tenantId: string): Promise<RailItem[]> {
  const [alerts, churn, postEvent, triage] = await Promise.allSettled([
    fetchAlerts(tenantId),
    fetchChurnSignals(tenantId),
    fetchPostEventSignals(tenantId),
    fetchTriageSignals(tenantId),
  ])

  const all: RailItem[] = []

  for (const result of [alerts, churn, postEvent, triage]) {
    if (result.status === 'fulfilled') {
      all.push(...result.value)
    }
  }

  all.sort((a, b) => b.score - a.score)

  return all.slice(0, MAX_ITEMS)
}
