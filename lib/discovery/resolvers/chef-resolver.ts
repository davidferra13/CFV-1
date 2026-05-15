import type { RailResolverResult } from './types'
import type { QueueItem } from '@/lib/queue/types'

/**
 * Resolve live data for chef rail items.
 *
 * Piggybacks on getPriorityQueue() (which aggregates inquiries, quotes,
 * events, messages, payments, client data) and getEvents() for
 * date-specific event items.
 */
export async function resolveChefRailData(
  userId: string,
  tenantId: string | undefined
): Promise<RailResolverResult> {
  const result: RailResolverResult = {}

  // Both functions handle auth internally via requireChef()
  const [queueResult, eventsResult] = await Promise.all([
    safeCall(() => import('@/lib/queue/actions').then((m) => m.getPriorityQueue())),
    safeCall(() => import('@/lib/events/actions').then((m) => m.getEvents())),
  ])

  // Map queue items by domain
  if (queueResult) {
    for (const item of queueResult.items) {
      const mapped = mapQueueItem(item)
      if (mapped) {
        result[mapped.definitionId] = mapped.variables
      }
    }
  }

  // Map upcoming events by date proximity
  if (eventsResult) {
    const today = todayString()
    for (const event of eventsResult) {
      const eventDate = event.event_date as string | null
      if (!eventDate || eventDate < today) continue

      const defId = getEventDefinitionId(eventDate, today)
      if (!defId) continue

      // Don't overwrite if queue already provided this definition
      if (result[defId]) continue

      result[defId] = {
        eventTitle: event.occasion || 'Event',
        eventId: event.id,
      }
    }
  }

  return result
}

// ---- Queue item mapping ----

function mapQueueItem(
  item: QueueItem
): { definitionId: string; variables: Record<string, unknown> } | null {
  const { domain, entityId, context } = item

  switch (domain) {
    case 'inquiry':
      return {
        definitionId: 'chef.inquiry_new',
        variables: { clientName: context.primaryLabel, inquiryId: entityId },
      }

    case 'quote':
      return {
        definitionId: mapQuoteDefinition(item),
        variables: { clientName: context.primaryLabel, eventId: entityId },
      }

    case 'event':
      return {
        definitionId: mapEventDomainDefinition(item),
        variables: { eventTitle: context.primaryLabel, eventId: entityId },
      }

    case 'message':
      return {
        definitionId: 'chef.message_new',
        variables: { clientName: context.primaryLabel, conversationId: entityId },
      }

    case 'financial':
      return {
        definitionId: mapFinancialDefinition(item),
        variables: {
          clientName: context.primaryLabel,
          eventId: entityId,
          amount: context.amountCents ? context.amountCents / 100 : 0,
        },
      }

    case 'post_event':
      return {
        definitionId: 'chef.event_wrap_up',
        variables: { eventTitle: context.primaryLabel, eventId: entityId },
      }

    case 'client':
      return {
        definitionId: mapClientDefinition(item),
        variables: { clientName: context.primaryLabel, clientId: entityId },
      }

    default:
      return null
  }
}

function mapQuoteDefinition(item: QueueItem): string {
  const title = item.title.toLowerCase()
  if (title.includes('draft')) return 'chef.quote_draft'
  if (title.includes('sent')) return 'chef.quote_sent'
  if (title.includes('ready')) return 'chef.quote_ready'
  return 'chef.quote_draft'
}

function mapEventDomainDefinition(item: QueueItem): string {
  const title = item.title.toLowerCase()
  if (title.includes('today')) return 'chef.event_today'
  if (title.includes('tomorrow')) return 'chef.event_tomorrow'
  if (title.includes('week')) return 'chef.event_this_week'
  return 'chef.event_this_week'
}

function mapFinancialDefinition(item: QueueItem): string {
  const title = item.title.toLowerCase()
  if (title.includes('overdue')) return 'chef.payment_overdue'
  if (title.includes('deposit')) return 'chef.deposit_due'
  if (title.includes('received')) return 'chef.payment_received'
  return 'chef.deposit_due'
}

function mapClientDefinition(item: QueueItem): string {
  const title = item.title.toLowerCase()
  if (title.includes('risk') || title.includes('at risk')) return 'chef.client_at_risk'
  return 'chef.client_rebook'
}

// ---- Event date helpers ----

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getEventDefinitionId(eventDate: string, today: string): string | null {
  const eventMs = new Date(eventDate + 'T00:00:00').getTime()
  const todayMs = new Date(today + 'T00:00:00').getTime()
  const diffDays = Math.round((eventMs - todayMs) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'chef.event_today'
  if (diffDays === 1) return 'chef.event_tomorrow'
  if (diffDays <= 3) return 'chef.event_3_days'
  if (diffDays <= 7) return 'chef.event_this_week'
  return null
}

// ---- Safe async wrapper ----

async function safeCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (err) {
    console.error('[chef-resolver] Data source failed:', err)
    return null
  }
}
