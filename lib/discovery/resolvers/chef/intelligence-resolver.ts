import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'
import type { ProactiveAlert } from '@/lib/intelligence/proactive-alerts'
import type { ChurnRiskClient } from '@/lib/intelligence/churn-prevention-triggers'
import type { PostEventTask } from '@/lib/intelligence/post-event-triggers'
import type { TriagedInquiry } from '@/lib/intelligence/inquiry-triage'

const MAX_ITEMS = 8

const SEVERITY_TO_TIER: Record<string, RailTier> = {
  critical: 'p0',
  warning: 'p1',
  high: 'p1',
  info: 'p2',
  opportunity: 'p3',
}

const CHURN_RISK_TO_TIER: Record<string, RailTier> = {
  critical: 'p0',
  high: 'p1',
  moderate: 'p2',
  low: 'p3',
}

const POST_EVENT_PRIORITY_TO_TIER: Record<string, RailTier> = {
  high: 'p1',
  medium: 'p2',
  low: 'p3',
}

function mapAlert(alert: ProactiveAlert): GodModeResolvedItem {
  return {
    definitionId: `intel-alert-${alert.id}`,
    tier: SEVERITY_TO_TIER[alert.severity] ?? 'p2',
    label: alert.title,
    context: alert.detail,
    destination: alert.link ?? '/dashboard',
    icon: alert.icon,
    sourceKind: 'system',
    score: alert.severity === 'critical' ? 100 : alert.severity === 'warning' ? 75 : 50,
    nextAction: alert.action,
  }
}

function mapChurnClient(client: ChurnRiskClient): GodModeResolvedItem {
  return {
    definitionId: `intel-churn-${client.clientId}`,
    tier: CHURN_RISK_TO_TIER[client.riskLevel] ?? 'p1',
    label: `${client.clientName} at risk`,
    context: client.triggers.map((t) => t.description).join('; ') || 'Engagement declining',
    destination: '/clients',
    icon: '⚠️',
    sourceKind: 'system',
    score: client.riskScore,
    nextAction: client.suggestedAction,
    data: {
      daysSinceLastEvent: client.daysSinceLastEvent,
      totalRevenueCents: client.totalRevenueCents,
    },
  }
}

function mapPostEventTask(task: PostEventTask): GodModeResolvedItem {
  return {
    definitionId: `intel-post-event-${task.eventId}-${task.taskType}`,
    tier: POST_EVENT_PRIORITY_TO_TIER[task.priority] ?? 'p2',
    label: task.title,
    context: `${task.clientName} (${task.daysOverdue > 0 ? `${task.daysOverdue}d overdue` : 'due'})`,
    destination: '/events',
    icon: '📬',
    sourceKind: 'system',
    score: task.daysOverdue > 0 ? 70 + Math.min(task.daysOverdue, 30) : 40,
    nextAction: task.description,
  }
}

function mapTriagedInquiry(inq: TriagedInquiry): GodModeResolvedItem {
  return {
    definitionId: `intel-triage-${inq.inquiryId}`,
    tier: inq.priorityLevel === 'urgent' ? 'p0' : 'p1',
    label: `Triage: ${inq.clientName ?? 'Unknown'}`,
    context: inq.suggestedAction,
    destination: '/inquiries',
    icon: '📨',
    sourceKind: 'system',
    score: inq.priorityScore,
    nextAction: inq.suggestedAction,
    data: {
      hoursUnanswered: inq.hoursUnanswered,
      estimatedValueCents: inq.estimatedValueCents,
      hasDateConflict: inq.hasDateConflict,
    },
  }
}

async function fetchAlerts(): Promise<GodModeResolvedItem[]> {
  try {
    const { getProactiveAlerts } = await import('@/lib/intelligence/proactive-alerts')
    const result = await getProactiveAlerts()
    return result.alerts.map(mapAlert)
  } catch {
    return []
  }
}

async function fetchChurnSignals(): Promise<GodModeResolvedItem[]> {
  try {
    const { getChurnPreventionTriggers } =
      await import('@/lib/intelligence/churn-prevention-triggers')
    const result = await getChurnPreventionTriggers()
    if (!result) return []
    return result.atRiskClients.slice(0, 3).map(mapChurnClient)
  } catch {
    return []
  }
}

async function fetchPostEventSignals(): Promise<GodModeResolvedItem[]> {
  try {
    const { getPostEventTriggers } = await import('@/lib/intelligence/post-event-triggers')
    const result = await getPostEventTriggers()
    if (!result) return []
    return result.tasks
      .filter((t) => t.daysOverdue >= 0)
      .slice(0, 3)
      .map(mapPostEventTask)
  } catch {
    return []
  }
}

async function fetchTriageSignals(): Promise<GodModeResolvedItem[]> {
  try {
    const { getInquiryTriage } = await import('@/lib/intelligence/inquiry-triage')
    const result = await getInquiryTriage()
    if (!result) return []
    return result.triaged
      .filter((i) => i.priorityLevel === 'urgent' || i.priorityLevel === 'high')
      .slice(0, 3)
      .map(mapTriagedInquiry)
  } catch {
    return []
  }
}

export async function resolveIntelligenceSignals(
  _ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const [alerts, churn, postEvent, triage] = await Promise.allSettled([
    fetchAlerts(),
    fetchChurnSignals(),
    fetchPostEventSignals(),
    fetchTriageSignals(),
  ])

  const all: GodModeResolvedItem[] = []

  for (const result of [alerts, churn, postEvent, triage]) {
    if (result.status === 'fulfilled') {
      all.push(...result.value)
    }
  }

  all.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  return all.slice(0, MAX_ITEMS)
}
