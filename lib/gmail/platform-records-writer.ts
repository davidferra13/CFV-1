// Platform Records Write-Through
// Called by Gmail sync pipeline to write to platform_records / platform_snapshots / platform_payouts
// alongside legacy inquiry.external_* fields. This enables incremental migration to the new
// marketplace operating layer without breaking existing reads.

import { getMarketplacePlatform } from '@/lib/marketplace/platforms'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = { from: (table: string) => any; rpc: (...args: any[]) => any }

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PlatformRecordInput {
  tenantId: string
  inquiryId: string
  clientId?: string | null
  eventId?: string | null
  platform: string
  externalInquiryId?: string | null
  externalUriToken?: string | null
  externalUrl?: string | null
  requestUrl?: string | null
  proposalUrl?: string | null
  guestContactUrl?: string | null
  bookingUrl?: string | null
  menuUrl?: string | null
  statusOnPlatform?: string | null
  nextActionRequired?: string | null
  nextActionBy?: string | null
  lastCaptureType?: string | null
  payload?: Record<string, unknown>
}

export interface EmailSnapshotInput {
  tenantId: string
  platformRecordId: string
  inquiryId: string
  eventId?: string | null
  captureType: string // 'new_inquiry', 'booking_confirmed', 'client_message', 'payment', 'customer_info'
  clientName?: string | null
  email?: string | null
  phone?: string | null
  bookingDate?: string | null
  guestCount?: number | null
  location?: string | null
  occasion?: string | null
  amountCents?: number | null
  summary?: string | null
  textExcerpt?: string | null
  source?: string
  snapshotAt?: string | null
  metadata?: Record<string, unknown>
}

export interface PayoutInput {
  tenantId: string
  platformRecordId: string
  inquiryId: string
  eventId?: string | null
  platform: string
  grossBookingCents?: number | null
  commissionPercent?: number | null
  commissionAmountCents?: number | null
  netPayoutCents?: number | null
  payoutStatus?: string
  payoutArrivalDate?: string | null
  payoutReference?: string | null
  source?: string
}

// ─── Core Writers ───────────────────────────────────────────────────────────

/**
 * Upsert a platform_record for an inquiry.
 * If one already exists for this inquiry_id, it updates instead of inserting.
 * Returns the platform_record ID, or null if the write failed (non-blocking).
 */
export async function ensurePlatformRecord(
  db: DbClient,
  input: PlatformRecordInput
): Promise<string | null> {
  try {
    const { data, error } = await db
      .from('platform_records')
      .upsert(
        {
          tenant_id: input.tenantId,
          inquiry_id: input.inquiryId,
          client_id: input.clientId || null,
          event_id: input.eventId || null,
          platform: input.platform,
          external_inquiry_id: input.externalInquiryId || null,
          external_uri_token: input.externalUriToken || null,
          external_url: input.externalUrl || null,
          request_url: input.requestUrl || null,
          proposal_url: input.proposalUrl || null,
          guest_contact_url: input.guestContactUrl || null,
          booking_url: input.bookingUrl || null,
          menu_url: input.menuUrl || null,
          status_on_platform: input.statusOnPlatform || 'new',
          next_action_required: input.nextActionRequired || null,
          next_action_by: input.nextActionBy || null,
          last_capture_type: input.lastCaptureType || 'gmail',
          link_health: 'unknown',
          payload: (input.payload || {}) as any,
        },
        { onConflict: 'inquiry_id' }
      )
      .select('id')
      .single()

    if (error) {
      console.error('[platform-records] ensurePlatformRecord failed (non-fatal):', error.message)
      return null
    }
    return data?.id ?? null
  } catch (err) {
    console.error('[platform-records] ensurePlatformRecord exception (non-fatal):', err)
    return null
  }
}

/**
 * Create an email-sourced snapshot for a platform record.
 * Non-blocking: logs errors but never throws.
 */
export async function createEmailSnapshot(db: DbClient, input: EmailSnapshotInput): Promise<void> {
  try {
    const { error } = await db.from('platform_snapshots').insert({
      tenant_id: input.tenantId,
      platform_record_id: input.platformRecordId,
      inquiry_id: input.inquiryId,
      event_id: input.eventId || null,
      capture_type: input.captureType,
      source: input.source || 'gmail',
      snapshot_at: input.snapshotAt || undefined,
      summary: input.summary || null,
      text_excerpt: input.textExcerpt?.slice(0, 2000) || null,
      extracted_client_name: input.clientName || null,
      extracted_email: input.email || null,
      extracted_phone: input.phone || null,
      extracted_booking_date: input.bookingDate || null,
      extracted_guest_count: input.guestCount || null,
      extracted_location: input.location || null,
      extracted_occasion: input.occasion || null,
      extracted_amount_cents: input.amountCents || null,
      metadata: (input.metadata || {}) as any,
    })

    if (error) {
      console.error('[platform-records] createEmailSnapshot failed (non-fatal):', error.message)
    }
  } catch (err) {
    console.error('[platform-records] createEmailSnapshot exception (non-fatal):', err)
  }
}

/**
 * Upsert a payout record for a platform record.
 * Uses the platform_record_id unique index for idempotency.
 * Non-blocking: logs errors but never throws.
 */
export async function upsertPlatformPayout(db: DbClient, input: PayoutInput): Promise<void> {
  try {
    const platformConfig = getMarketplacePlatform(input.platform)
    const commissionPercent =
      input.commissionPercent ?? platformConfig?.defaultCommissionPercent ?? null

    const { error } = await db.from('platform_payouts').upsert(
      {
        tenant_id: input.tenantId,
        platform_record_id: input.platformRecordId,
        inquiry_id: input.inquiryId,
        event_id: input.eventId || null,
        platform: input.platform,
        gross_booking_cents: input.grossBookingCents || null,
        commission_percent: commissionPercent,
        commission_amount_cents: input.commissionAmountCents || null,
        net_payout_cents: input.netPayoutCents || null,
        payout_status: input.payoutStatus || 'untracked',
        payout_arrival_date: input.payoutArrivalDate || null,
        payout_reference: input.payoutReference || null,
        source: input.source || 'gmail',
        payload: {} as any,
      },
      { onConflict: 'platform_record_id' }
    )

    if (error) {
      console.error('[platform-records] upsertPlatformPayout failed (non-fatal):', error.message)
    }
  } catch (err) {
    console.error('[platform-records] upsertPlatformPayout exception (non-fatal):', err)
  }
}

/**
 * Update a platform record's status and action fields.
 * Used when booking is confirmed, payment arrives, etc.
 * Non-blocking.
 */
export async function updatePlatformRecordStatus(
  db: DbClient,
  opts: {
    tenantId: string
    inquiryId: string
    statusOnPlatform?: string
    nextActionRequired?: string | null
    nextActionBy?: string | null
    eventId?: string | null
    clientId?: string | null
  }
): Promise<string | null> {
  try {
    const updateFields: Record<string, unknown> = {}
    if (opts.statusOnPlatform) updateFields.status_on_platform = opts.statusOnPlatform
    if (opts.nextActionRequired !== undefined)
      updateFields.next_action_required = opts.nextActionRequired
    if (opts.nextActionBy !== undefined) updateFields.next_action_by = opts.nextActionBy
    if (opts.eventId) updateFields.event_id = opts.eventId
    if (opts.clientId) updateFields.client_id = opts.clientId

    const { data, error } = await db
      .from('platform_records')
      .update(updateFields)
      .eq('inquiry_id', opts.inquiryId)
      .eq('tenant_id', opts.tenantId)
      .select('id')
      .single()

    if (error) {
      console.error(
        '[platform-records] updatePlatformRecordStatus failed (non-fatal):',
        error.message
      )
      return null
    }
    return data?.id ?? null
  } catch (err) {
    console.error('[platform-records] updatePlatformRecordStatus exception (non-fatal):', err)
    return null
  }
}

/**
 * Get a platform_record ID by inquiry_id for adding snapshots/payouts to existing records.
 */
export async function getPlatformRecordIdByInquiry(
  db: DbClient,
  tenantId: string,
  inquiryId: string
): Promise<string | null> {
  try {
    const { data } = await db
      .from('platform_records')
      .select('id')
      .eq('inquiry_id', inquiryId)
      .eq('tenant_id', tenantId)
      .single()
    return data?.id ?? null
  } catch {
    return null
  }
}
