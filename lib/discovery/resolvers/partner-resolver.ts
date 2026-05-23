import { pgClient } from '@/lib/db'
import type { RailResolverResult } from './types'

// ---------------------------------------------------------------------------
// Partner Universal Rail Data Resolver
// Scoped to own referrals/events/venues. NEVER sees other partners' data,
// chef internal financials, or client PII beyond first name.
// ---------------------------------------------------------------------------

export async function resolvePartnerRailData(
  userId: string,
  tenantId: string | undefined
): Promise<RailResolverResult> {
  // Resolve the partner record for this user
  let partnerId: string | null = null
  let partnerType: string | null = null
  try {
    const rows = await pgClient`
      SELECT id, partner_type FROM referral_partners WHERE auth_user_id = ${userId} LIMIT 1
    `
    const row = rows[0] as { id: string; partner_type: string } | undefined
    if (row) {
      partnerId = row.id
      partnerType = row.partner_type
    }
  } catch (err) {
    console.error('[resolvePartnerRailData] partner lookup failed:', err)
    return {}
  }

  if (!partnerId) return {}

  const result: RailResolverResult = {}

  const [referrals, cohosting, vendor, compliance, comms] = await Promise.all([
    resolveReferralTracking(partnerId),
    resolveCohostingAndVenue(partnerId, tenantId),
    partnerType === 'vendor' || partnerType === 'supplier'
      ? resolveVendorSupplier(partnerId, tenantId)
      : Promise.resolve({}),
    resolveCompliance(partnerId),
    resolveCommunications(partnerId, userId),
  ])

  Object.assign(result, referrals, cohosting, vendor, compliance, comms)
  return result
}

// ---------------------------------------------------------------------------
// Group 1: Referral Tracking
// ---------------------------------------------------------------------------

async function resolveReferralTracking(partnerId: string): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const rows = await pgClient`
      SELECT ra.id, ra.status, ra.client_first_name, ra.event_id,
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
      event_id: string | null
      commission_cents: number | null
      commission_status: string | null
    }[]

    const converted = attrs.filter((a) => a.status === 'converted')
    const pending = attrs.filter((a) => a.status === 'pending')
    const payoutReady = attrs.filter(
      (a) => a.commission_status === 'ready' || a.commission_status === 'approved'
    )

    if (converted.length > 0) {
      result['partner.referral_converted'] = {
        clientFirstName: converted[0].client_first_name ?? 'A client',
        referralId: converted[0].id,
        count: converted.length,
      }
    }
    if (pending.length > 0) {
      result['partner.referral_pending'] = {
        clientFirstName: pending[0].client_first_name ?? 'Someone',
        referralId: pending[0].id,
        count: pending.length,
      }
    }
    if (payoutReady.length > 0) {
      result['partner.referral_payout_ready'] = {
        count: payoutReady.length,
        amountCents: payoutReady.reduce((sum, a) => sum + (a.commission_cents ?? 0), 0),
      }
    }

    // Check if payout method is missing
    const payoutRows = await pgClient`
      SELECT payout_method FROM referral_partners
      WHERE id = ${partnerId}
      LIMIT 1
    `
    const payoutMethod = (payoutRows[0] as { payout_method: string | null } | undefined)
      ?.payout_method
    if (!payoutMethod && payoutReady.length > 0) {
      // Override: payout ready but no method = urgent blocker
      result['partner.referral_payout_ready'] = {
        ...(result['partner.referral_payout_ready'] ?? {}),
        payoutMethodMissing: true,
      }
    }
  } catch (err) {
    console.error('[resolvePartnerRailData] referrals group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Group 2: Co-hosting and Venue
// ---------------------------------------------------------------------------

async function resolveCohostingAndVenue(
  partnerId: string,
  tenantId: string | undefined
): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const today = formatDate(new Date())
    const rows = await pgClient`
      SELECT e.id, e.occasion, e.event_date::text, e.status
      FROM events e
      JOIN partner_locations pl ON pl.id = e.venue_partner_id
      WHERE pl.partner_id = ${partnerId}
        AND e.event_date >= ${today}
        AND e.status NOT IN ('cancelled')
      ORDER BY e.event_date ASC
      LIMIT 1
    `
    const evt = rows[0] as
      | { id: string; occasion: string | null; event_date: string; status: string }
      | undefined
    if (evt) {
      result['partner.cohost_event_upcoming'] = {
        eventId: evt.id,
        eventTitle: evt.occasion,
        eventDate: evt.event_date,
      }
    }

    // Pending tasks for co-hosted events
    if (tenantId) {
      const taskRows = await pgClient`
        SELECT COUNT(*)::int AS count
        FROM collaboration_tasks ct
        JOIN events e ON e.id = ct.event_id
        JOIN partner_locations pl ON pl.id = e.venue_partner_id
        WHERE pl.partner_id = ${partnerId}
          AND ct.status = 'pending'
          AND ct.assignee_type = 'partner'
      `
      const taskCount = (taskRows[0] as { count: number } | undefined)?.count ?? 0
      if (taskCount > 0) {
        result['partner.cohost_task_assigned'] = { count: taskCount }
      }
    }
  } catch (err) {
    console.error('[resolvePartnerRailData] cohosting group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Group 3: Vendor / Supplier
// ---------------------------------------------------------------------------

async function resolveVendorSupplier(
  partnerId: string,
  tenantId: string | undefined
): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const [orders, invoices, shortages] = await Promise.all([
      pgClient`
        SELECT COUNT(*)::int AS count
        FROM supplier_requests
        WHERE supplier_partner_id = ${partnerId}
          AND status = 'pending'
      `.catch(() => [{ count: 0 }]),
      pgClient`
        SELECT COUNT(*)::int AS count
        FROM vendor_invoice_records
        WHERE partner_id = ${partnerId}
          AND status = 'ready'
      `.catch(() => [{ count: 0 }]),
      pgClient`
        SELECT COUNT(*)::int AS count
        FROM supplier_requests
        WHERE supplier_partner_id = ${partnerId}
          AND status = 'shortage_alert'
      `.catch(() => [{ count: 0 }]),
    ])

    const orderCount = (orders[0] as { count: number } | undefined)?.count ?? 0
    const invoiceCount = (invoices[0] as { count: number } | undefined)?.count ?? 0
    const shortageCount = (shortages[0] as { count: number } | undefined)?.count ?? 0

    if (orderCount > 0) {
      result['partner.supplier_order_request'] = { count: orderCount }
    }
    if (invoiceCount > 0) {
      result['partner.supplier_invoice_ready'] = { count: invoiceCount }
    }
    if (shortageCount > 0) {
      result['partner.supplier_shortage_alert'] = { count: shortageCount }
    }
  } catch (err) {
    console.error('[resolvePartnerRailData] vendor group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Group 4: Compliance
// ---------------------------------------------------------------------------

async function resolveCompliance(partnerId: string): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const soon = new Date(Date.now() + 30 * 86_400_000).toISOString()
    const rows = await pgClient`
      SELECT agreement_type, expires_at::text
      FROM partner_agreements
      WHERE partner_id = ${partnerId}
        AND expires_at IS NOT NULL
        AND expires_at <= ${soon}
        AND status = 'active'
      ORDER BY expires_at ASC
      LIMIT 1
    `
    const agreement = rows[0] as { agreement_type: string; expires_at: string } | undefined
    if (agreement) {
      result['partner.partnership_agreement_expiring'] = {
        agreementType: agreement.agreement_type,
        expiresAt: agreement.expires_at,
      }
    }
  } catch (err) {
    console.error('[resolvePartnerRailData] compliance group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Group 5: Communications
// ---------------------------------------------------------------------------

async function resolveCommunications(
  partnerId: string,
  userId: string
): Promise<RailResolverResult> {
  const result: RailResolverResult = {}
  try {
    const rows = await pgClient`
      SELECT COUNT(*)::int AS count
      FROM chat_messages cm
      JOIN conversation_participants cp
        ON cp.conversation_id = cm.conversation_id
        AND cp.auth_user_id = ${userId}
      WHERE cm.sender_id != ${userId}
        AND cm.deleted_at IS NULL
        AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
    `
    const count = (rows[0] as { count: number } | undefined)?.count ?? 0
    if (count > 0) {
      result['partner.message_from_chef_partner'] = { count }
    }
  } catch (err) {
    console.error('[resolvePartnerRailData] communications group failed:', err)
  }
  return result
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
