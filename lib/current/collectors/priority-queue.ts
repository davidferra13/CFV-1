// Collector: Priority Queue -> CurrentUnit[]

import type { PriorityQueue, QueueItem } from '@/lib/queue/types'
import type { CurrentCategory, CurrentUnit } from '../types'

const DOMAIN_TO_CATEGORY: Record<string, CurrentCategory> = {
  inquiry: 'communication',
  message: 'communication',
  quote: 'money',
  event: 'prep',
  financial: 'money',
  post_event: 'completion',
  client: 'communication',
  culinary: 'completion',
  network: 'growth',
}

const DOMAIN_ACTION_LABEL: Record<string, string> = {
  inquiry: 'Reply',
  message: 'Reply',
  quote: 'Review',
  event: 'Open',
  financial: 'Review',
  post_event: 'Review',
  client: 'View',
  culinary: 'Open',
  network: 'Open',
  contact: 'View',
}

function mapItem(item: QueueItem): CurrentUnit {
  return {
    id: `priority_queue:${item.entityType}:${item.entityId}`,
    category: DOMAIN_TO_CATEGORY[item.domain] ?? 'completion',
    urgency: item.urgency,
    title: item.title,
    description: item.description,
    href: item.href,
    actions: [{ label: DOMAIN_ACTION_LABEL[item.domain] || 'Open', href: item.href }],
    score: 0, // set by ranker
    source: 'priority_queue',
    entityId: item.entityId,
    entityType: item.entityType,
    contextLines: [item.contextLine, item.context.secondaryLabel].filter((s): s is string => !!s),
    estimatedMinutes: item.estimatedMinutes ?? null,
    dueAt: item.dueAt ?? null,
    revenueCents: item.context.amountCents ?? null,
    createdAt: item.createdAt,
  }
}

export function collectFromPriorityQueue(queue: PriorityQueue): CurrentUnit[] {
  return queue.items.map(mapItem)
}
