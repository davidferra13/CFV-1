// Priority Queue - Quote Provider
// Surfaces: draft quotes, expiring sent quotes, accepted quotes not converted to events

import type { QueueItem, ScoreInputs } from '../types'
import { computeScore, urgencyFromScore } from '../score'

export async function getQuoteQueueItems(db: any, tenantId: string): Promise<QueueItem[]> {
  const items: QueueItem[] = []
  const now = new Date()

  const { data: quotes } = await db
    .from('quotes')
    .select(
      `
      id, status, total_quoted_cents, valid_until, created_at,
      event_id,
      client:clients(id, full_name)
    `
    )
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'sent', 'accepted'])

  if (!quotes) return items

  for (const quote of quotes) {
    const clientName = (quote.client as any)?.full_name ?? 'Unknown'
    const hoursSinceCreated = (now.getTime() - new Date(quote.created_at).getTime()) / 3600000
    const amountCents = quote.total_quoted_cents ?? 0

    // Draft quotes needing completion
    if (quote.status === 'draft') {
      const inputs: ScoreInputs = {
        hoursUntilDue: null,
        impactWeight: 0.5,
        isBlocking: true,
        hoursSinceCreated,
        revenueCents: amountCents,
        isExpiring: false,
      }
      const score = computeScore(inputs)
      items.push({
        id: `quote:quote:${quote.id}:complete_draft`,
        domain: 'quote',
        urgency: urgencyFromScore(score),
        score,
        title: 'Complete draft quote',
        description: `Quote for ${clientName} is still in draft.`,
        href: `/quotes/${quote.id}`,
        icon: 'FileEdit',
        context: { primaryLabel: clientName, amountCents },
        createdAt: quote.created_at,
        dueAt: null,
        blocks: 'Client cannot accept until quote is sent',
        entityId: quote.id,
        entityType: 'quote',
      })
    }

    // Sent quotes nearing expiration (within 7 days)
    if (quote.status === 'sent' && quote.valid_until) {
      const validUntil = new Date(quote.valid_until + 'T23:59:59')
      const hoursUntilExpiry = (validUntil.getTime() - now.getTime()) / 3600000
      if (hoursUntilExpiry < 168) {
        const inputs: ScoreInputs = {
          hoursUntilDue: hoursUntilExpiry,
          impactWeight: 0.7,
          isBlocking: false,
          hoursSinceCreated,
          revenueCents: amountCents,
          isExpiring: true,
        }
        const score = computeScore(inputs)
        items.push({
          id: `quote:quote:${quote.id}:expiring`,
          domain: 'quote',
          urgency: urgencyFromScore(score),
          score,
          title: 'Quote expiring soon',
          description: `Quote for ${clientName} ${hoursUntilExpiry < 0 ? 'has expired' : `expires in ${Math.ceil(hoursUntilExpiry / 24)} days`}. Follow up or extend.`,
          href: `/quotes/${quote.id}`,
          icon: 'Timer',
          context: { primaryLabel: clientName, amountCents },
          createdAt: quote.created_at,
          dueAt: quote.valid_until,
          entityId: quote.id,
          entityType: 'quote',
        })
      }
    }

    // Accepted quotes not yet converted to events
    if (quote.status === 'accepted' && !quote.event_id) {
      const inputs: ScoreInputs = {
        hoursUntilDue: Math.max(0, 48 - hoursSinceCreated),
        impactWeight: 0.8,
        isBlocking: true,
        hoursSinceCreated,
        revenueCents: amountCents,
        isExpiring: false,
      }
      const score = computeScore(inputs)
      items.push({
        id: `quote:quote:${quote.id}:convert_to_event`,
        domain: 'quote',
        urgency: urgencyFromScore(score),
        score,
        title: 'Convert accepted quote to event',
        description: `${clientName} accepted. Create the event to start the workflow.`,
        href: `/quotes/${quote.id}`,
        icon: 'ArrowRightCircle',
        context: { primaryLabel: clientName, amountCents },
        createdAt: quote.created_at,
        dueAt: null,
        blocks: 'Event creation and prep workflow',
        entityId: quote.id,
        entityType: 'quote',
      })
    }
  }

  return items
}
