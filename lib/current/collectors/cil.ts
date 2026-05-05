// Collector: CIL Insights -> CurrentUnit[]
// Surfaces graph intelligence directly to the chef (previously Remy-only).

import type { CILInsight } from '@/lib/cil/scanner'
import type { CurrentCategory, CurrentUrgency, CurrentUnit } from '../types'

const TYPE_TO_CATEGORY: Record<CILInsight['type'], CurrentCategory> = {
  opportunity: 'growth',
  gap: 'optimization',
  drift: 'optimization',
  anomaly: 'communication',
  milestone: 'optimization',
}

const SEVERITY_TO_URGENCY: Record<CILInsight['severity'], CurrentUrgency> = {
  high: 'normal',
  medium: 'low',
  low: 'low',
}

function mapInsight(insight: CILInsight, index: number): CurrentUnit {
  return {
    id: `cil:insight:${insight.type}-${index}`,
    category: TYPE_TO_CATEGORY[insight.type],
    urgency: SEVERITY_TO_URGENCY[insight.severity],
    title: insight.title,
    description: insight.detail,
    href: '/dashboard',
    actions: [{ label: 'Review', href: '/dashboard' }],
    score: 0,
    source: 'cil',
    entityId: `${insight.type}-${index}`,
    entityType: 'insight',
    contextLines:
      insight.entityIds.length > 0 ? [`Involves ${insight.entityIds.length} entities`] : [],
    estimatedMinutes: null,
    dueAt: null,
    revenueCents: null,
    createdAt: new Date().toISOString(),
  }
}

export function collectFromCIL(insights: CILInsight[]): CurrentUnit[] {
  return insights.filter((i) => i.severity === 'high' || i.severity === 'medium').map(mapInsight)
}
