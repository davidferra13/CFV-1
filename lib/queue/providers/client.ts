// Priority Queue — Client Provider
// Surfaces: upcoming milestones, dormant client re-engagement

import type { SupabaseClient } from '@supabase/supabase-js'
import type { QueueItem, ScoreInputs } from '../types'
import { computeScore, urgencyFromScore } from '../score'
import { getMilestoneOutreachSuggestions } from '@/lib/clients/milestones'

export async function getClientQueueItems(
  supabase: SupabaseClient,
  tenantId: string
): Promise<QueueItem[]> {
  const items: QueueItem[] = []
  const now = new Date()

  // 1. Milestones — re-use existing fetcher (already auth-scoped)
  try {
    const outreach = await getMilestoneOutreachSuggestions()
    for (const item of outreach) {
      if (item.daysUntil > 14) continue // Only surface within 2 weeks

      const hoursUntilDue = item.daysUntil * 24
      const inputs: ScoreInputs = {
        hoursUntilDue,
        impactWeight: item.daysUntil <= 3 ? 0.4 : 0.2,
        isBlocking: false,
        hoursSinceCreated: 0,
        revenueCents: 0,
        isExpiring: item.daysUntil <= 7,
      }
      const score = computeScore(inputs)
      items.push({
        id: `client:client:${item.clientId}:milestone_${item.milestone.type}`,
        domain: 'client',
        urgency: urgencyFromScore(score),
        score,
        title: `${item.milestone.type === 'birthday' ? 'Birthday' : 'Milestone'} outreach`,
        description: item.suggestion,
        href: `/clients/${item.clientId}`,
        icon: item.milestone.type === 'birthday' ? 'Cake' : 'Gift',
        context: {
          primaryLabel: item.clientName,
          secondaryLabel: item.daysUntil === 0 ? 'Today' : `In ${item.daysUntil} days`,
        },
        createdAt: now.toISOString(),
        dueAt: null,
        entityId: item.clientId,
        entityType: 'client',
      })
    }
  } catch {
    // Milestones may not be available — graceful degradation
  }

  // 2. Dormant clients (top 5 by lifetime value) from client_financial_summary view
  try {
    const { data: dormantClients } = await supabase
      .from('client_financial_summary')
      .select('client_id, last_event_date, is_dormant, lifetime_value_cents')
      .eq('tenant_id', tenantId)
      .eq('is_dormant', true)
      .order('lifetime_value_cents', { ascending: false })
      .limit(5)

    if (dormantClients && dormantClients.length > 0) {
      const clientIds = dormantClients.map((c) => c.client_id).filter(Boolean) as string[]
      const { data: clients } = await supabase
        .from('clients')
        .select('id, full_name')
        .in('id', clientIds)

      const nameMap = new Map((clients || []).map((c) => [c.id, c.full_name]))

      for (const dc of dormantClients) {
        if (!dc.client_id) continue
        const clientName = nameMap.get(dc.client_id) ?? 'Unknown'
        const inputs: ScoreInputs = {
          hoursUntilDue: null,
          impactWeight: 0.15,
          isBlocking: false,
          hoursSinceCreated: dc.last_event_date
            ? (now.getTime() - new Date(dc.last_event_date).getTime()) / 3600000
            : 0,
          revenueCents: 0,
          isExpiring: false,
        }
        const score = computeScore(inputs)
        items.push({
          id: `client:client:${dc.client_id}:re_engage`,
          domain: 'client',
          urgency: urgencyFromScore(score),
          score,
          title: 'Re-engage dormant client',
          description: `${clientName} has not booked recently. Consider a personal outreach.`,
          href: `/clients/${dc.client_id}`,
          icon: 'UserPlus',
          context: { primaryLabel: clientName },
          createdAt: now.toISOString(),
          dueAt: null,
          entityId: dc.client_id,
          entityType: 'client',
        })
      }
    }
  } catch {
    // View may not exist — graceful degradation
  }

  return items
}
