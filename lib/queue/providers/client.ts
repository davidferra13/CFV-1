// Priority Queue - Client Provider
// Surfaces: upcoming milestones, dormant client re-engagement

import type { QueueItem, ScoreInputs } from '../types'
import { computeScore, urgencyFromScore } from '../score'
import { getMilestoneOutreachSuggestions } from '@/lib/clients/milestones'
import { getClientContributionPortfolio } from '@/lib/client-contribution/actions'
import type { ClientContributionSnapshot } from '@/lib/client-contribution/types'

function contributionActionLabel(action: ClientContributionSnapshot['recommendedAction']): string {
  const labels: Record<ClientContributionSnapshot['recommendedAction'], string> = {
    protect_relationship: 'Protect relationship',
    collect_balance: 'Collect balance',
    review_pricing: 'Review pricing',
    repair_data: 'Repair data',
    reengage: 'Re-engage client',
    nurture_referrals: 'Nurture referral',
    build_history: 'Build history',
    maintain: 'Maintain',
  }
  return labels[action]
}

function contributionViewForAction(action: ClientContributionSnapshot['recommendedAction']) {
  if (action === 'collect_balance') return 'collections'
  if (action === 'review_pricing') return 'margin'
  if (action === 'reengage') return 'risk'
  if (action === 'nurture_referrals') return 'referrals'
  if (action === 'repair_data' || action === 'build_history') return 'missing'
  return 'top'
}

function shouldSurfaceContribution(snapshot: ClientContributionSnapshot): boolean {
  if (snapshot.reviewState.status === 'dismissed') return false
  if (snapshot.outstandingBalanceCents > 0) return true
  if (snapshot.churnRisk === 'high' && snapshot.paidRevenueCents >= 500_000) return true
  if (
    snapshot.marginPercent != null &&
    snapshot.marginPercent < 25 &&
    snapshot.paidRevenueCents >= 500_000
  ) {
    return true
  }
  if (snapshot.referralPotential === 'high' && snapshot.contributionScore >= 55) return true
  return snapshot.missingData.length >= 3
}

function contributionScoreInputs(snapshot: ClientContributionSnapshot): ScoreInputs {
  return {
    hoursUntilDue: snapshot.outstandingBalanceCents > 0 || snapshot.churnRisk === 'high' ? 24 : 120,
    impactWeight:
      snapshot.paidRevenueCents >= 2_500_000 || snapshot.outstandingBalanceCents > 0 ? 0.65 : 0.4,
    isBlocking:
      snapshot.outstandingBalanceCents > 0 ||
      snapshot.recommendedAction === 'repair_data' ||
      snapshot.recommendedAction === 'build_history',
    hoursSinceCreated: snapshot.daysSinceLastEvent == null ? 0 : snapshot.daysSinceLastEvent * 24,
    revenueCents: Math.max(snapshot.paidRevenueCents, snapshot.outstandingBalanceCents),
    isExpiring: snapshot.churnRisk === 'high',
  }
}

export async function getClientQueueItems(db: any, tenantId: string): Promise<QueueItem[]> {
  const items: QueueItem[] = []
  const now = new Date()

  // 1. Milestones - re-use existing fetcher (already auth-scoped)
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
    // Milestones may not be available - graceful degradation
  }

  // 2. Dormant clients (top 5 by lifetime value) from client_financial_summary view
  try {
    const { data: dormantClients } = await db
      .from('client_financial_summary')
      .select('client_id, last_event_date, is_dormant, lifetime_value_cents')
      .eq('tenant_id', tenantId)
      .eq('is_dormant', true)
      .order('lifetime_value_cents', { ascending: false })
      .limit(5)

    if (dormantClients && dormantClients.length > 0) {
      const clientIds = dormantClients.map((c: any) => c.client_id).filter(Boolean) as string[]
      const { data: clients } = await db.from('clients').select('id, full_name').in('id', clientIds)

      const nameMap = new Map((clients || []).map((c: any) => [c.id, c.full_name]))

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
          context: { primaryLabel: clientName } as any,
          createdAt: now.toISOString(),
          dueAt: null,
          entityId: dc.client_id,
          entityType: 'client',
        })
      }
    }
  } catch {
    // View may not exist - graceful degradation
  }

  // 3. Client contribution strategy decisions from the shared contribution engine.
  try {
    const portfolio = await getClientContributionPortfolio()
    const contributionItems = portfolio.snapshots
      .filter(shouldSurfaceContribution)
      .slice(0, 8)
      .map((snapshot) => {
        const score = computeScore(contributionScoreInputs(snapshot))
        const href = `/clients/${snapshot.clientId}#contribution`
        const viewHref = `/clients/contribution?view=${contributionViewForAction(snapshot.recommendedAction)}`
        const action = contributionActionLabel(snapshot.recommendedAction)
        return {
          id: `client:client:${snapshot.clientId}:contribution_${snapshot.recommendedAction}`,
          domain: 'client',
          urgency: urgencyFromScore(score),
          score,
          title: action,
          description: `${snapshot.clientName}: ${snapshot.evidence.map((item) => `${item.label} ${item.value}`).join(', ')}.`,
          href,
          icon:
            snapshot.recommendedAction === 'collect_balance'
              ? 'CircleDollarSign'
              : snapshot.recommendedAction === 'review_pricing'
                ? 'TrendingUp'
                : 'Users',
          context: {
            primaryLabel: snapshot.clientName,
            secondaryLabel: `${snapshot.dataConfidence.level} confidence`,
            amountCents: Math.max(snapshot.paidRevenueCents, snapshot.outstandingBalanceCents),
          },
          createdAt: now.toISOString(),
          dueAt: null,
          entityId: snapshot.clientId,
          entityType: 'client',
          estimatedMinutes: 10,
          contextLine: `Contribution: ${action}. Portfolio view: ${viewHref}`,
        } satisfies QueueItem
      })

    items.push(...contributionItems)
  } catch {
    // Contribution engine is non-critical to the base queue.
  }

  return items
}
