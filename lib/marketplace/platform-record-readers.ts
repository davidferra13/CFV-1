'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getMarketplacePlatform } from './platforms'

// ─── Types ──────────────────────────────────────────────────────────────────

export type PlatformRecordSummary = {
  id: string
  inquiryId: string
  clientId: string | null
  eventId: string | null
  platform: string
  platformLabel: string
  externalInquiryId: string | null
  externalUrl: string | null
  requestUrl: string | null
  proposalUrl: string | null
  guestContactUrl: string | null
  bookingUrl: string | null
  menuUrl: string | null
  statusOnPlatform: string | null
  statusDetail: string | null
  nextActionRequired: string | null
  nextActionBy: string | null
  linkHealth: string
  lastSnapshotAt: string | null
  lastActionAt: string | null
  summary: string | null
  createdAt: string
  updatedAt: string
}

export type PlatformSnapshotEntry = {
  id: string
  captureType: string
  source: string
  summary: string | null
  clientName: string | null
  email: string | null
  phone: string | null
  bookingDate: string | null
  guestCount: number | null
  location: string | null
  occasion: string | null
  amountCents: number | null
  snapshotAt: string
}

export type PlatformPayoutSummary = {
  id: string
  platform: string
  grossBookingCents: number | null
  commissionPercent: number | null
  commissionAmountCents: number | null
  netPayoutCents: number | null
  payoutStatus: string
  payoutArrivalDate: string | null
  source: string
}

export type PlatformActionEntry = {
  id: string
  actionType: string
  actionLabel: string
  actionSource: string
  actionUrl: string | null
  actedAt: string
}

// ─── Readers ────────────────────────────────────────────────────────────────

/**
 * Get the platform record for a specific inquiry.
 * Returns null if no platform_record exists yet (pre-write-through inquiries).
 */
export async function getPlatformRecordByInquiry(
  inquiryId: string
): Promise<PlatformRecordSummary | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('platform_records')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('inquiry_id', inquiryId)
    .maybeSingle()

  if (error || !data) return null

  const platform = getMarketplacePlatform(data.platform)
  return {
    id: data.id,
    inquiryId: data.inquiry_id,
    clientId: data.client_id,
    eventId: data.event_id,
    platform: data.platform,
    platformLabel: platform?.label ?? data.platform,
    externalInquiryId: data.external_inquiry_id,
    externalUrl: data.external_url,
    requestUrl: data.request_url,
    proposalUrl: data.proposal_url,
    guestContactUrl: data.guest_contact_url,
    bookingUrl: data.booking_url,
    menuUrl: data.menu_url,
    statusOnPlatform: data.status_on_platform,
    statusDetail: data.status_detail,
    nextActionRequired: data.next_action_required,
    nextActionBy: data.next_action_by,
    linkHealth: data.link_health,
    lastSnapshotAt: data.last_snapshot_at,
    lastActionAt: data.last_action_at,
    summary: data.summary,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/**
 * Get all snapshots for a platform record, newest first.
 */
export async function getPlatformSnapshots(inquiryId: string): Promise<PlatformSnapshotEntry[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('platform_snapshots')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('inquiry_id', inquiryId)
    .order('snapshot_at', { ascending: false })
    .limit(50)

  if (!data) return []

  return data.map((s: any) => ({
    id: s.id,
    captureType: s.capture_type,
    source: s.source,
    summary: s.summary,
    clientName: s.extracted_client_name,
    email: s.extracted_email,
    phone: s.extracted_phone,
    bookingDate: s.extracted_booking_date,
    guestCount: s.extracted_guest_count,
    location: s.extracted_location,
    occasion: s.extracted_occasion,
    amountCents: s.extracted_amount_cents,
    snapshotAt: s.snapshot_at,
  }))
}

/**
 * Get the payout record for a platform record (1:1 relationship).
 */
export async function getPlatformPayout(inquiryId: string): Promise<PlatformPayoutSummary | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('platform_payouts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('inquiry_id', inquiryId)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    platform: data.platform,
    grossBookingCents: data.gross_booking_cents,
    commissionPercent: data.commission_percent ? Number(data.commission_percent) : null,
    commissionAmountCents: data.commission_amount_cents,
    netPayoutCents: data.net_payout_cents,
    payoutStatus: data.payout_status,
    payoutArrivalDate: data.payout_arrival_date,
    source: data.source,
  }
}

/**
 * Get the action log for a platform record, newest first.
 */
export async function getPlatformActionLog(inquiryId: string): Promise<PlatformActionEntry[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('platform_action_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('inquiry_id', inquiryId)
    .order('acted_at', { ascending: false })
    .limit(50)

  if (!data) return []

  return data.map((a: any) => ({
    id: a.id,
    actionType: a.action_type,
    actionLabel: a.action_label,
    actionSource: a.action_source,
    actionUrl: a.action_url,
    actedAt: a.acted_at,
  }))
}

/**
 * Get queue counts for the marketplace command center.
 * Counts platform_records by status for the current chef.
 */
export async function getMarketplaceQueueCounts(): Promise<{
  new: number
  responded: number
  booked: number
  contactRevealed: number
  paid: number
  total: number
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('platform_records')
    .select('status_on_platform')
    .eq('tenant_id', tenantId)

  if (!data) return { new: 0, responded: 0, booked: 0, contactRevealed: 0, paid: 0, total: 0 }

  const counts = {
    new: 0,
    responded: 0,
    booked: 0,
    contactRevealed: 0,
    paid: 0,
    total: data.length,
  }
  for (const row of data) {
    const status = row.status_on_platform
    if (status === 'new') counts.new++
    else if (status === 'responded') counts.responded++
    else if (status === 'booked') counts.booked++
    else if (status === 'contact_revealed') counts.contactRevealed++
    else if (status === 'paid') counts.paid++
  }

  return counts
}
