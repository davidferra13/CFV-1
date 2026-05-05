// Collector: Next Best Action -> CurrentUnit[]

import type { NextBestAction } from '@/lib/clients/next-best-action'
import type { CurrentCategory, CurrentUnit } from '../types'

const ACTION_TO_CATEGORY: Record<string, CurrentCategory> = {
  booking_blocker: 'money',
  reply_inquiry: 'communication',
  follow_up_quote: 'money',
  quote_revision: 'money',
  re_engage: 'growth',
  schedule_event: 'money',
  send_birthday: 'communication',
  ask_referral: 'growth',
  reach_out: 'growth',
}

function mapAction(action: NextBestAction): CurrentUnit {
  return {
    id: `next_best_action:client:${action.clientId}`,
    category: ACTION_TO_CATEGORY[action.actionType] ?? 'communication',
    urgency: action.urgency,
    title: action.label,
    description: action.description,
    href: action.href,
    actions: [{ label: action.interventionLabel || 'Take action', href: action.href }],
    score: 0,
    source: 'next_best_action',
    entityId: action.clientId,
    entityType: 'client',
    contextLines: [`Client: ${action.clientName}`, `Health: ${action.healthScore}%`],
    estimatedMinutes: action.actionType === 'send_birthday' ? 2 : 5,
    dueAt: null,
    revenueCents: null,
    createdAt: new Date().toISOString(),
  }
}

export function collectFromNextBestActions(actions: NextBestAction[]): CurrentUnit[] {
  return actions.map(mapAction)
}
