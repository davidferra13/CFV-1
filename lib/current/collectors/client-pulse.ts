// Collector: Client Pulse -> CurrentUnit[]

import type { ClientPulse, PulseItem } from '@/lib/clients/pulse-actions'
import type { CurrentUrgency, CurrentUnit } from '../types'

const URGENCY_MAP: Record<PulseItem['urgency'], CurrentUrgency> = {
  critical: 'critical',
  overdue: 'high',
  due: 'normal',
  ok: 'low',
}

function mapPulseItem(pulse: ClientPulse, item: PulseItem): CurrentUnit {
  return {
    id: `client_pulse:${item.type}:${item.entityId}`,
    category: 'communication',
    urgency: URGENCY_MAP[item.urgency],
    title: `${pulse.clientName}: ${item.label}`,
    description: item.detail,
    href: item.href,
    actions: [{ label: item.actionLabel, href: item.href }],
    score: 0,
    source: 'client_pulse',
    entityId: item.entityId,
    entityType: item.type,
    contextLines: [`Waiting ${item.daysWaiting} day${item.daysWaiting !== 1 ? 's' : ''}`],
    estimatedMinutes: item.type === 'followup' ? 5 : 3,
    dueAt: null,
    revenueCents: null,
    createdAt: new Date(Date.now() - item.daysWaiting * 86400000).toISOString(),
  }
}

export function collectFromClientPulse(pulses: ClientPulse[]): CurrentUnit[] {
  const units: CurrentUnit[] = []
  for (const pulse of pulses) {
    for (const item of pulse.items) {
      units.push(mapPulseItem(pulse, item))
    }
  }
  return units
}
