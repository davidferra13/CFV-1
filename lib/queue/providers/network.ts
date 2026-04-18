// Priority Queue - Network Provider
// Surfaces: pending inbound handoffs, pending connection requests

import type { QueueItem, ScoreInputs } from '../types'
import { computeScore, urgencyFromScore } from '../score'

export async function getNetworkQueueItems(db: any, chefId: string): Promise<QueueItem[]> {
  const items: QueueItem[] = []
  const now = new Date()

  const [handoffResult, connectionResult] = await Promise.all([
    db
      .from('chef_collab_handoff_recipients')
      .select(
        'id, handoff_id, created_at, chef_handoffs!inner(title, from_chef_id, occasion, budget_cents, expires_at)'
      )
      .eq('recipient_chef_id', chefId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
    db
      .from('chef_connections')
      .select(
        'id, requester_chef_id, created_at, requester_chef:chefs!chef_connections_requester_chef_id_fkey(business_name)'
      )
      .eq('recipient_chef_id', chefId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // Pending handoffs (time-sensitive, revenue-generating)
  for (const recipient of handoffResult.data ?? []) {
    const r = recipient as any
    const handoff = r.chef_handoffs
    const hoursSinceCreated = (now.getTime() - new Date(r.created_at).getTime()) / 3600000

    // Check if handoff has an expiry
    let hoursUntilDue: number | null = null
    if (handoff?.expires_at) {
      hoursUntilDue = (new Date(handoff.expires_at).getTime() - now.getTime()) / 3600000
    } else {
      // Default 48-hour response window for handoffs
      hoursUntilDue = Math.max(0, 48 - hoursSinceCreated)
    }

    const inputs: ScoreInputs = {
      hoursUntilDue,
      impactWeight: 0.75, // potential revenue from referral
      isBlocking: false,
      hoursSinceCreated,
      revenueCents: handoff?.budget_cents ?? 0,
      isExpiring: !!handoff?.expires_at,
    }
    const score = computeScore(inputs)

    items.push({
      id: `network:handoff:${r.id}:respond`,
      domain: 'network',
      urgency: urgencyFromScore(score),
      score,
      title: handoff?.title || 'New handoff from another chef',
      description: handoff?.occasion
        ? `Lead referral: ${handoff.occasion}. Review and respond.`
        : 'A chef in your network referred a lead to you. Review and respond.',
      href: '/network?tab=collab',
      icon: 'ArrowRightLeft',
      context: {
        primaryLabel: handoff?.title || 'Handoff',
        secondaryLabel: handoff?.occasion || undefined,
        amountCents: handoff?.budget_cents || undefined,
      },
      createdAt: r.created_at,
      dueAt: handoff?.expires_at || null,
      entityId: r.id,
      entityType: 'handoff_recipient',
    })
  }

  // Pending connection requests
  for (const conn of connectionResult.data ?? []) {
    const c = conn as any
    const requesterName = c.requester_chef?.business_name || 'A chef'
    const hoursSinceCreated = (now.getTime() - new Date(c.created_at).getTime()) / 3600000

    const inputs: ScoreInputs = {
      hoursUntilDue: null, // no hard deadline
      impactWeight: 0.4, // relationship building
      isBlocking: false,
      hoursSinceCreated,
      revenueCents: 0,
      isExpiring: false,
    }
    const score = computeScore(inputs)

    items.push({
      id: `network:connection:${c.id}:respond`,
      domain: 'network',
      urgency: urgencyFromScore(score),
      score,
      title: `Connection request from ${requesterName}`,
      description: `${requesterName} wants to connect with you.`,
      href: '/network?tab=connections',
      icon: 'UserPlus',
      context: {
        primaryLabel: requesterName,
      },
      createdAt: c.created_at,
      dueAt: null,
      entityId: c.id,
      entityType: 'connection_request',
    })
  }

  return items
}
