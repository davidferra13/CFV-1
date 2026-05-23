// lib/rail/resolvers/partner-rail-resolver.ts
// Partner Rail source: returns RailItem[] for referral activity,
// upcoming venue events, and pending approvals.
// Scoped to the partner's own data. Never exposes other partners,
// chef internal financials, or client PII beyond first name.

import type { RailItem, RailTier } from '@/lib/rail/types'

const MS_DAY = 86_400_000
const MS_HOUR = 3_600_000

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function getPartnerRailItems(tenantId: string, userId: string): Promise<RailItem[]> {
  // Look up partner record for this user
  let partnerId: string | null = null
  let partnerType: string | null = null
  try {
    const { pgClient } = await import('@/lib/db')
    const rows = await pgClient`
      SELECT id, partner_type FROM referral_partners
      WHERE auth_user_id = ${userId} LIMIT 1
    `
    const row = rows[0] as { id: string; partner_type: string } | undefined
    if (row) {
      partnerId = row.id
      partnerType = row.partner_type
    }
  } catch (err) {
    console.error('[rail/resolvers/partner] partner lookup failed:', err)
    return []
  }

  if (!partnerId) return []

  const [referrals, venueEvents, approvals] = await Promise.allSettled([
    resolveReferralActivity(tenantId, partnerId),
    resolveUpcomingVenueEvents(tenantId, partnerId),
    resolvePendingApprovals(tenantId, partnerId, partnerType),
  ])

  return [
    ...extractFulfilled(referrals),
    ...extractFulfilled(venueEvents),
    ...extractFulfilled(approvals),
  ]
}

function extractFulfilled<T>(result: PromiseSettledResult<T[]>): T[] {
  return result.status === 'fulfilled' ? result.value : []
}

// ---------------------------------------------------------------------------
// Group 1: Referral Activity
// ---------------------------------------------------------------------------

async function resolveReferralActivity(tenantId: string, partnerId: string): Promise<RailItem[]> {
  const items: RailItem[] = []
  const now = new Date()

  try {
    const { pgClient } = await import('@/lib/db')
    const rows = await pgClient`
      SELECT ra.id, ra.status, ra.client_first_name,
             pc.amount_cents AS commission_cents, pc.status AS commission_status
      FROM referral_attributions ra
      LEFT JOIN partner_commissions pc ON pc.referral_id = ra.id
      WHERE ra.partner_id = ${partnerId}
      ORDER BY ra.created_at DESC
      LIMIT 10
    `
    const attrs = rows as unknown as {
      id: string
      status: string
      client_first_name: string | null
      commission_cents: number | null
      commission_status: string | null
    }[]

    // Converted referrals
    const converted = attrs.filter((a) => a.status === 'converted')
    if (converted.length > 0) {
      items.push({
        id: `partner-referral-converted-${converted[0].id}`,
        tenantId,
        source: 'partner-referrals',
        tier: 'action',
        state: 'surfaced',
        score: 65,
        title: `Referral converted: ${converted[0].client_first_name ?? 'A client'}`,
        subtitle:
          converted.length > 1
            ? `${converted.length} total conversions`
            : 'New conversion recorded',
        actionUrl: '/partner/referrals',
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: 1440,
        metadata: {
          referralId: converted[0].id,
          count: converted.length,
          type: 'referral_converted',
        },
      })
    }

    // Pending referrals
    const pending = attrs.filter((a) => a.status === 'pending')
    if (pending.length > 0) {
      items.push({
        id: `partner-referral-pending-${pending[0].id}`,
        tenantId,
        source: 'partner-referrals',
        tier: 'awareness',
        state: 'surfaced',
        score: 35,
        title: `${pending.length} pending referral${pending.length > 1 ? 's' : ''}`,
        subtitle: `Latest: ${pending[0].client_first_name ?? 'Someone'}`,
        actionUrl: '/partner/referrals',
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: 2880,
        metadata: {
          referralId: pending[0].id,
          count: pending.length,
          type: 'referral_pending',
        },
      })
    }

    // Payout ready
    const payoutReady = attrs.filter(
      (a) => a.commission_status === 'ready' || a.commission_status === 'approved'
    )
    if (payoutReady.length > 0) {
      const totalCents = payoutReady.reduce((sum, a) => sum + (a.commission_cents ?? 0), 0)

      // Check if payout method is missing (high urgency blocker)
      const payoutRows = await pgClient`
        SELECT payout_method FROM referral_partners
        WHERE id = ${partnerId} LIMIT 1
      `
      const payoutMethod = (payoutRows[0] as { payout_method: string | null } | undefined)
        ?.payout_method
      const methodMissing = !payoutMethod

      items.push({
        id: `partner-payout-ready-${partnerId}`,
        tenantId,
        source: 'partner-referrals',
        tier: methodMissing ? 'critical' : 'action',
        state: 'surfaced',
        score: methodMissing ? 90 : 70,
        title: methodMissing
          ? 'Payout method required'
          : `$${(totalCents / 100).toFixed(2)} payout ready`,
        subtitle: methodMissing
          ? `$${(totalCents / 100).toFixed(2)} waiting, add payout method`
          : `${payoutReady.length} commission${payoutReady.length > 1 ? 's' : ''} approved`,
        actionUrl: '/partner/settings',
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: methodMissing ? 60 : 1440,
        metadata: {
          count: payoutReady.length,
          amountCents: totalCents,
          payoutMethodMissing: methodMissing,
          type: 'payout_ready',
        },
      })
    }
  } catch (err) {
    console.error('[rail/resolvers/partner] referral activity failed:', err)
  }
  return items
}

// ---------------------------------------------------------------------------
// Group 2: Upcoming Events at Venue
// ---------------------------------------------------------------------------

async function resolveUpcomingVenueEvents(
  tenantId: string,
  partnerId: string
): Promise<RailItem[]> {
  const items: RailItem[] = []
  const now = new Date()

  try {
    const { pgClient } = await import('@/lib/db')
    const today = formatDate(now)

    const rows = await pgClient`
      SELECT e.id, e.occasion, e.event_date::text AS event_date,
             e.guest_count, e.status, e.serve_time,
             c.full_name AS client_name
      FROM events e
      JOIN partner_locations pl ON pl.id = e.venue_partner_id
      LEFT JOIN clients c ON c.id = e.client_id
      WHERE pl.partner_id = ${partnerId}
        AND e.event_date >= ${today}
        AND e.status NOT IN ('cancelled', 'completed')
      ORDER BY e.event_date ASC
      LIMIT 5
    `
    const events = rows as unknown as {
      id: string
      occasion: string | null
      event_date: string
      guest_count: number | null
      status: string
      serve_time: string | null
      client_name: string | null
    }[]

    for (const evt of events) {
      const eventMs = new Date(evt.event_date).getTime()
      const diffMs = eventMs - now.getTime()
      const diffHours = diffMs / MS_HOUR
      const diffDays = diffMs / MS_DAY

      let tier: RailTier
      let score: number
      if (diffHours <= 24) {
        tier = 'critical'
        score = 88
      } else if (diffDays <= 3) {
        tier = 'action'
        score = 65
      } else if (diffDays <= 7) {
        tier = 'awareness'
        score = 38
      } else {
        tier = 'opportunity'
        score = 18
      }

      const clientLabel = evt.client_name ? evt.client_name.split(' ')[0] : 'Event'
      const occasionSuffix = evt.occasion ? ` (${evt.occasion})` : ''

      let subtitle: string
      if (diffHours <= 0) {
        subtitle = 'Event is today at your venue'
      } else if (diffHours <= 24) {
        subtitle = `In ${Math.round(diffHours)}h, ${evt.guest_count ?? '?'} guests`
      } else {
        subtitle = `In ${Math.round(diffDays)}d, ${evt.guest_count ?? '?'} guests`
      }

      items.push({
        id: `partner-venue-event-${evt.id}`,
        tenantId,
        source: 'partner-venue',
        tier,
        state: 'surfaced',
        score,
        title: `${clientLabel}${occasionSuffix}`,
        subtitle,
        actionUrl: `/partner/events/${evt.id}`,
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: Math.max(Math.round(diffMs / 60_000), 60),
        metadata: {
          eventId: evt.id,
          eventDate: evt.event_date,
          guestCount: evt.guest_count,
          status: evt.status,
          type: 'venue_event',
        },
      })
    }
  } catch (err) {
    console.error('[rail/resolvers/partner] venue events failed:', err)
  }
  return items
}

// ---------------------------------------------------------------------------
// Group 3: Pending Approvals
// ---------------------------------------------------------------------------

async function resolvePendingApprovals(
  tenantId: string,
  partnerId: string,
  partnerType: string | null
): Promise<RailItem[]> {
  const items: RailItem[] = []
  const now = new Date()

  try {
    const { pgClient } = await import('@/lib/db')

    const [taskRows, agreementRows, orderRows] = await Promise.all([
      pgClient`
        SELECT COUNT(*)::int AS count
        FROM collaboration_tasks ct
        JOIN events e ON e.id = ct.event_id
        JOIN partner_locations pl ON pl.id = e.venue_partner_id
        WHERE pl.partner_id = ${partnerId}
          AND ct.status = 'pending'
          AND ct.assignee_type = 'partner'
      `.catch(() => [{ count: 0 }]),
      pgClient`
        SELECT COUNT(*)::int AS count
        FROM partner_agreements
        WHERE partner_id = ${partnerId}
          AND status = 'pending_review'
      `.catch(() => [{ count: 0 }]),
      partnerType === 'vendor' || partnerType === 'supplier'
        ? pgClient`
            SELECT COUNT(*)::int AS count
            FROM supplier_requests
            WHERE supplier_partner_id = ${partnerId}
              AND status = 'pending'
          `.catch(() => [{ count: 0 }])
        : Promise.resolve([{ count: 0 }]),
    ])

    const taskCount = (taskRows[0] as { count: number } | undefined)?.count ?? 0
    const agreementCount = (agreementRows[0] as { count: number } | undefined)?.count ?? 0
    const orderCount = (orderRows[0] as { count: number } | undefined)?.count ?? 0

    if (taskCount > 0) {
      items.push({
        id: `partner-tasks-pending-${partnerId}`,
        tenantId,
        source: 'partner-approvals',
        tier: 'action',
        state: 'surfaced',
        score: 60,
        title: `${taskCount} co-host task${taskCount > 1 ? 's' : ''} pending`,
        subtitle: 'Review and complete assigned tasks',
        actionUrl: '/partner/tasks',
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: 1440,
        metadata: { count: taskCount, type: 'cohost_tasks' },
      })
    }

    if (agreementCount > 0) {
      items.push({
        id: `partner-agreements-pending-${partnerId}`,
        tenantId,
        source: 'partner-approvals',
        tier: 'critical',
        state: 'surfaced',
        score: 82,
        title: `${agreementCount} agreement${agreementCount > 1 ? 's' : ''} awaiting review`,
        subtitle: 'Partnership agreements need your signature',
        actionUrl: '/partner/agreements',
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: 720,
        metadata: { count: agreementCount, type: 'agreement_review' },
      })
    }

    if (orderCount > 0) {
      items.push({
        id: `partner-orders-pending-${partnerId}`,
        tenantId,
        source: 'partner-approvals',
        tier: 'action',
        state: 'surfaced',
        score: 68,
        title: `${orderCount} supplier order${orderCount > 1 ? 's' : ''} pending`,
        subtitle: 'New order requests from chefs',
        actionUrl: '/partner/orders',
        createdAt: now,
        surfacedAt: now,
        ttlMinutes: 1440,
        metadata: { count: orderCount, type: 'supplier_orders' },
      })
    }
  } catch (err) {
    console.error('[rail/resolvers/partner] pending approvals failed:', err)
  }
  return items
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
