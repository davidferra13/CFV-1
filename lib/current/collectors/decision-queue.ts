// Collector: Decision Queue -> CurrentUnit[]

import type { DecisionQueueItem, DecisionQueueResult } from '@/lib/decision-queue/actions'
import type { CurrentCategory, CurrentUnit } from '../types'

const CATEGORY_MAP: Record<string, CurrentCategory> = {
  inquiry: 'communication',
  qualification: 'communication',
  menu: 'completion',
  proposal: 'money',
  payment: 'money',
  procurement: 'prep',
  prep: 'prep',
  equipment: 'prep',
  packing: 'prep',
  timeline: 'prep',
  travel: 'prep',
  execution: 'prep',
  breakdown: 'completion',
  post_event: 'completion',
  follow_up: 'communication',
  booking: 'money',
  retention: 'growth',
  milestone: 'communication',
  referral: 'growth',
  outreach: 'growth',
}

function mapItem(item: DecisionQueueItem): CurrentUnit {
  return {
    id: `decision_queue:decision:${item.id}`,
    category: CATEGORY_MAP[item.category] ?? 'completion',
    urgency: item.urgency,
    title: item.title,
    description: item.description,
    href: item.href || '/dashboard',
    actions: [{ label: 'Decide', href: item.href || '/dashboard' }],
    score: 0,
    source: 'decision_queue',
    entityId: item.id,
    entityType: 'decision',
    contextLines: item.context ? [item.context] : [],
    estimatedMinutes: null,
    dueAt: null,
    revenueCents: null,
    createdAt: new Date().toISOString(),
  }
}

export function collectFromDecisionQueue(result: DecisionQueueResult): CurrentUnit[] {
  return result.items.map(mapItem)
}
