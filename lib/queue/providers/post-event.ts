// Priority Queue - Post-Event Provider
// Surfaces: unfiled AARs, unsent follow-ups, unsent review links, incomplete resets

import type { QueueItem, ScoreInputs } from '../types'
import { computeScore, urgencyFromScore } from '../score'

export async function getPostEventQueueItems(
  supabase: any,
  tenantId: string
): Promise<QueueItem[]> {
  const items: QueueItem[] = []
  const now = new Date()

  const { data: events } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date,
      aar_filed, follow_up_sent, review_link_sent, reset_complete,
      client:clients(id, full_name)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .or(
      'aar_filed.eq.false,follow_up_sent.eq.false,review_link_sent.eq.false,reset_complete.eq.false'
    )
    .order('event_date', { ascending: false })
    .limit(15)

  for (const event of events || []) {
    const clientName = (event.client as any)?.full_name ?? 'Unknown'
    const hoursSinceEvent = (now.getTime() - new Date(event.event_date).getTime()) / 3600000
    const occasion = event.occasion || 'Event'

    // AAR not filed - 48h ideal window
    if (!event.aar_filed) {
      const inputs: ScoreInputs = {
        hoursUntilDue: Math.max(-hoursSinceEvent, 48 - hoursSinceEvent),
        impactWeight: 0.5,
        isBlocking: false,
        hoursSinceCreated: Math.max(0, hoursSinceEvent),
        revenueCents: 0,
        isExpiring: true,
      }
      const score = computeScore(inputs)
      items.push({
        id: `post_event:event:${event.id}:file_aar`,
        domain: 'post_event',
        urgency: urgencyFromScore(score),
        score,
        title: 'File Event Review',
        description: `AAR for ${occasion} (${clientName}) \u2014 capture insights while fresh.`,
        href: `/events/${event.id}`,
        icon: 'ClipboardList',
        context: { primaryLabel: clientName, secondaryLabel: occasion },
        createdAt: event.event_date,
        dueAt: null,
        entityId: event.id,
        entityType: 'event',
      })
    }

    // Follow-up not sent - 24h ideal window
    if (!event.follow_up_sent) {
      const inputs: ScoreInputs = {
        hoursUntilDue: Math.max(-hoursSinceEvent, 24 - hoursSinceEvent),
        impactWeight: 0.6,
        isBlocking: false,
        hoursSinceCreated: Math.max(0, hoursSinceEvent),
        revenueCents: 0,
        isExpiring: true,
      }
      const score = computeScore(inputs)
      items.push({
        id: `post_event:event:${event.id}:send_follow_up`,
        domain: 'post_event',
        urgency: urgencyFromScore(score),
        score,
        title: 'Send client follow-up',
        description: `Thank ${clientName} for ${occasion}. A personal touch builds loyalty.`,
        href: `/events/${event.id}`,
        icon: 'HeartHandshake',
        context: { primaryLabel: clientName, secondaryLabel: occasion },
        createdAt: event.event_date,
        dueAt: null,
        entityId: event.id,
        entityType: 'event',
      })
    }

    // Review link not sent - 72h window
    if (!event.review_link_sent) {
      const inputs: ScoreInputs = {
        hoursUntilDue: Math.max(-hoursSinceEvent, 72 - hoursSinceEvent),
        impactWeight: 0.3,
        isBlocking: false,
        hoursSinceCreated: Math.max(0, hoursSinceEvent),
        revenueCents: 0,
        isExpiring: true,
      }
      const score = computeScore(inputs)
      items.push({
        id: `post_event:event:${event.id}:send_review_link`,
        domain: 'post_event',
        urgency: urgencyFromScore(score),
        score,
        title: 'Send review link',
        description: `Request a review from ${clientName} for ${occasion}.`,
        href: `/events/${event.id}`,
        icon: 'Star',
        context: { primaryLabel: clientName },
        createdAt: event.event_date,
        dueAt: null,
        entityId: event.id,
        entityType: 'event',
      })
    }

    // Reset not complete - 12h ideal (same night)
    if (!event.reset_complete) {
      const inputs: ScoreInputs = {
        hoursUntilDue: Math.max(-hoursSinceEvent, 12 - hoursSinceEvent),
        impactWeight: 0.4,
        isBlocking: false,
        hoursSinceCreated: Math.max(0, hoursSinceEvent),
        revenueCents: 0,
        isExpiring: true,
      }
      const score = computeScore(inputs)
      items.push({
        id: `post_event:event:${event.id}:complete_reset`,
        domain: 'post_event',
        urgency: urgencyFromScore(score),
        score,
        title: 'Complete post-service reset',
        description: `Clean cooler, put away equipment, start laundry for ${occasion}.`,
        href: `/events/${event.id}`,
        icon: 'PackageCheck',
        context: { primaryLabel: clientName },
        createdAt: event.event_date,
        dueAt: null,
        entityId: event.id,
        entityType: 'event',
      })
    }
  }

  return items
}
