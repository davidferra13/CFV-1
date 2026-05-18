import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000
const MAX_ITEMS = 10
const LOOKBACK_DAYS = 7
const CLIENT_LIMIT = 5
const EVENT_LIMIT = 3

// ---------------------------------------------------------------------------
// Entity-scoped resolvers (contextual rail)
// ---------------------------------------------------------------------------

async function resolveClientCommunicationFeed(
  ctx: GodModeResolverContext,
  clientId: string
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')
  const cutoff = new Date(ctx.now.getTime() - LOOKBACK_DAYS * MS_DAY).toISOString()

  try {
    const rows = await pgClient`
      SELECT
        sm.id,
        sm.subject,
        sm.channel,
        sm.status,
        sm.scheduled_for AS "scheduledFor",
        sm.sent_at AS "sentAt",
        sm.context_type AS "contextType",
        c.full_name AS "recipientName"
      FROM scheduled_messages sm
      LEFT JOIN clients c ON c.id = sm.recipient_id
      WHERE sm.chef_id = ${ctx.tenantId}
        AND sm.recipient_id = ${clientId}
        AND (
          (sm.status = 'draft' AND sm.sent_at IS NULL)
          OR (sm.status = 'failed')
          OR (sm.status = 'sent' AND sm.sent_at >= ${cutoff}::timestamptz)
        )
      ORDER BY COALESCE(sm.sent_at, sm.scheduled_for, sm.created_at) DESC
      LIMIT ${CLIENT_LIMIT}
    `
    return rowsToItems(rows as unknown as FeedRow[])
  } catch (err) {
    console.error('[communication-feed-resolver] Client-scoped query failed:', err)
    return []
  }
}

async function resolveEventCommunicationFeed(
  ctx: GodModeResolverContext,
  eventId: string
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')
  const cutoff = new Date(ctx.now.getTime() - LOOKBACK_DAYS * MS_DAY).toISOString()

  try {
    // Look up the event's client, then filter messages to that client
    const eventRows = await pgClient`
      SELECT client_id FROM events WHERE id = ${eventId} AND chef_id = ${ctx.tenantId} LIMIT 1
    `
    const eventClientId = (eventRows as unknown as { client_id: string | null }[])[0]?.client_id
    if (!eventClientId) return []

    const rows = await pgClient`
      SELECT
        sm.id,
        sm.subject,
        sm.channel,
        sm.status,
        sm.scheduled_for AS "scheduledFor",
        sm.sent_at AS "sentAt",
        sm.context_type AS "contextType",
        c.full_name AS "recipientName"
      FROM scheduled_messages sm
      LEFT JOIN clients c ON c.id = sm.recipient_id
      WHERE sm.chef_id = ${ctx.tenantId}
        AND sm.recipient_id = ${eventClientId}
        AND (
          (sm.status = 'draft' AND sm.sent_at IS NULL)
          OR (sm.status = 'failed')
          OR (sm.status = 'sent' AND sm.sent_at >= ${cutoff}::timestamptz)
        )
      ORDER BY COALESCE(sm.sent_at, sm.scheduled_for, sm.created_at) DESC
      LIMIT ${EVENT_LIMIT}
    `
    return rowsToItems(rows as unknown as FeedRow[])
  } catch (err) {
    console.error('[communication-feed-resolver] Event-scoped query failed:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Shared row-to-item mapper
// ---------------------------------------------------------------------------

interface FeedRow {
  id: string
  subject: string | null
  channel: string
  status: string
  scheduledFor: string | null
  sentAt: string | null
  contextType: string | null
  recipientName: string | null
}

function rowsToItems(rows: FeedRow[]): GodModeResolvedItem[] {
  const items: GodModeResolvedItem[] = []
  for (const row of rows) {
    let tier: RailTier
    let label: string
    let context: string
    const recipient = row.recipientName ?? 'recipient'

    if (row.status === 'failed') {
      tier = 'p1'
      label = `Failed to send ${row.channel} to ${recipient}`
      context = row.subject ? `"${row.subject}"` : 'Delivery failed'
    } else if (row.status === 'draft') {
      tier = 'p2'
      label = `Draft ${row.channel} for ${recipient}`
      context = row.subject ? `Review: "${row.subject}"` : 'CIL-generated draft awaiting review'
    } else {
      tier = 'p4'
      label = `Sent ${row.channel} to ${recipient}`
      context = row.subject ?? 'Delivered'
    }

    items.push({
      definitionId: `comm-feed-${row.id}`,
      tier,
      label,
      context,
      destination: '/communication/drafts',
      icon: row.status === 'failed' ? 'alert-circle' : row.status === 'draft' ? 'edit' : 'check',
      sourceKind: 'message',
      loopState: row.status === 'sent' ? 'done' : 'active',
      evidenceLabel: 'confirmed',
      confidence: 1,
      nextAction:
        row.status === 'failed'
          ? 'Retry or edit message'
          : row.status === 'draft'
            ? 'Review and approve'
            : null,
      data: { messageId: row.id, status: row.status, channel: row.channel },
    })
  }
  return items
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

export async function resolveCommunicationFeed(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  // Entity-scoped branches for contextual rail
  if (ctx.entityContext?.type === 'client') {
    return resolveClientCommunicationFeed(ctx, ctx.entityContext.id)
  }
  if (ctx.entityContext?.type === 'event') {
    return resolveEventCommunicationFeed(ctx, ctx.entityContext.id)
  }

  const { pgClient } = await import('@/lib/db')

  const cutoff = new Date(ctx.now.getTime() - LOOKBACK_DAYS * MS_DAY).toISOString()

  let rows: {
    id: string
    subject: string | null
    channel: string
    status: string
    scheduledFor: string | null
    sentAt: string | null
    contextType: string | null
    recipientName: string | null
  }[]

  try {
    const result = await pgClient`
      SELECT
        sm.id,
        sm.subject,
        sm.channel,
        sm.status,
        sm.scheduled_for AS "scheduledFor",
        sm.sent_at AS "sentAt",
        sm.context_type AS "contextType",
        c.full_name AS "recipientName"
      FROM scheduled_messages sm
      LEFT JOIN clients c ON c.id = sm.recipient_id
      WHERE sm.chef_id = ${ctx.tenantId}
        AND (
          (sm.status = 'draft' AND sm.sent_at IS NULL)
          OR (sm.status = 'failed')
          OR (sm.status = 'sent' AND sm.sent_at >= ${cutoff}::timestamptz)
        )
      ORDER BY COALESCE(sm.sent_at, sm.scheduled_for, sm.created_at) DESC
      LIMIT ${MAX_ITEMS}
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[communication-feed-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    let tier: RailTier
    let label: string
    let context: string
    const recipient = row.recipientName ?? 'recipient'

    if (row.status === 'failed') {
      tier = 'p1'
      label = `Failed to send ${row.channel} to ${recipient}`
      context = row.subject ? `"${row.subject}"` : 'Delivery failed'
    } else if (row.status === 'draft') {
      tier = 'p2'
      label = `Draft ${row.channel} for ${recipient}`
      context = row.subject ? `Review: "${row.subject}"` : 'CIL-generated draft awaiting review'
    } else {
      tier = 'p4'
      label = `Sent ${row.channel} to ${recipient}`
      context = row.subject ?? 'Delivered'
    }

    items.push({
      definitionId: `comm-feed-${row.id}`,
      tier,
      label,
      context,
      destination: '/communication/drafts',
      icon: row.status === 'failed' ? 'alert-circle' : row.status === 'draft' ? 'edit' : 'check',
      sourceKind: 'system',
      loopState: row.status === 'sent' ? 'done' : 'active',
      evidenceLabel: 'confirmed',
      confidence: 1,
      nextAction:
        row.status === 'failed'
          ? 'Retry or edit message'
          : row.status === 'draft'
            ? 'Review and approve'
            : null,
      data: { messageId: row.id, status: row.status, channel: row.channel },
    })
  }

  return items
}
