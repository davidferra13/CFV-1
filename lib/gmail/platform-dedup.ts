// Platform-Level Inquiry Deduplication (Generalized)
// Prevents creating duplicate inquiries when marketplace platforms send the
// same notification email multiple times (different Gmail message IDs, same inquiry).
//
// Supports: TakeAChef, Yhangry, and any future platform integrations.
//
// Layer 1 (gmail_sync_log unique constraint) handles email-level dedup.
// This module handles Layer 2: inquiry-level dedup by matching on
// external_inquiry_id OR client name + date.
//
// Rule: NEVER overwrite or delete an existing inquiry. Duplicates are skipped.

import { collectStoredPlatformIdentityKeys, dedupeIdentityKeys } from './platform-identity'
import { namesMatch } from '@/lib/utils/name-matching'

export interface PlatformDedupMatch {
  isDuplicate: boolean
  existingInquiryId: string | null
  matchedBy: 'external_id' | 'name_and_date' | null
}

/**
 * Check if a platform inquiry already exists in the database.
 *
 * Strategy:
 * 1. If externalId is provided, check by (tenant_id, external_platform, external_inquiry_id)
 * 2. Fallback: check by client name (case-insensitive) + confirmed_date within same channel
 *
 * Returns the existing inquiry ID if found, or null if this is a new inquiry.
 */
export async function checkPlatformInquiryDuplicate(
  db: any,
  tenantId: string,
  opts: {
    channel: string
    externalId?: string | null
    externalIds?: Array<string | null | undefined>
    clientName: string
    eventDate: string | null
  }
): Promise<PlatformDedupMatch> {
  const noMatch: PlatformDedupMatch = {
    isDuplicate: false,
    existingInquiryId: null,
    matchedBy: null,
  }

  const candidateIdentityKeys = dedupeIdentityKeys([opts.externalId, ...(opts.externalIds ?? [])])

  // Layer 0: Check platform_records table first (canonical source after write-through)
  if (candidateIdentityKeys.length > 0) {
    const prMatch = await findInquiryViaPlatformRecords(
      db,
      tenantId,
      opts.channel,
      candidateIdentityKeys
    )
    if (prMatch) {
      return { isDuplicate: true, existingInquiryId: prMatch, matchedBy: 'external_id' }
    }
  }

  // Strategy 1: Match by stored platform identity key (most reliable)
  if (candidateIdentityKeys.length > 0) {
    const directMatch = await findInquiryByIdentityKeys(
      db,
      tenantId,
      opts.channel,
      candidateIdentityKeys
    )

    if (directMatch) {
      return { isDuplicate: true, existingInquiryId: directMatch, matchedBy: 'external_id' }
    }
  }

  // Strategy 2: Match by client name + date (fuzzy - for when we don't have an external ID)
  if (opts.clientName && opts.eventDate) {
    const { data } = await db
      .from('inquiries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('channel', opts.channel)
      .eq('confirmed_date', opts.eventDate)
      .limit(10)

    if (data && data.length > 0) {
      for (const row of data) {
        const { data: inquiry } = await db
          .from('inquiries')
          .select('id, client_id, unknown_fields')
          .eq('id', row.id)
          .single()

        if (!inquiry) continue

        const fields = inquiry.unknown_fields as Record<string, string> | null
        const storedName = fields?.original_sender_name || fields?.client_name || ''
        if (storedName && namesMatch(storedName, opts.clientName)) {
          return { isDuplicate: true, existingInquiryId: inquiry.id, matchedBy: 'name_and_date' }
        }

        if (inquiry.client_id) {
          const { data: client } = await db
            .from('clients')
            .select('full_name')
            .eq('id', inquiry.client_id)
            .single()

          if (client?.full_name && namesMatch(client.full_name, opts.clientName)) {
            return { isDuplicate: true, existingInquiryId: inquiry.id, matchedBy: 'name_and_date' }
          }
        }
      }
    }
  }

  return noMatch
}

/**
 * Find an existing platform inquiry by context (order ID, client name, date).
 * Used for matching follow-up emails (messages, bookings, customer info) to existing inquiries.
 */
export async function findPlatformInquiryByContext(
  db: any,
  tenantId: string,
  opts: {
    channel: string
    clientName: string | null
    eventDate: string | null
    orderId: string | null
    externalIds?: Array<string | null | undefined>
  }
): Promise<string | null> {
  const candidateIdentityKeys = dedupeIdentityKeys([opts.orderId, ...(opts.externalIds ?? [])])

  // Layer 0: Check platform_records table first (canonical source after write-through)
  if (candidateIdentityKeys.length > 0) {
    const prMatch = await findInquiryViaPlatformRecords(
      db,
      tenantId,
      opts.channel,
      candidateIdentityKeys
    )
    if (prMatch) return prMatch
  }

  // First try by platform identity key (order ID, quote ID, or link token)
  if (candidateIdentityKeys.length > 0) {
    const directMatch = await findInquiryByIdentityKeys(
      db,
      tenantId,
      opts.channel,
      candidateIdentityKeys
    )
    if (directMatch) return directMatch
  }

  // Fall back to client name + date matching
  if (!opts.clientName) return null

  const query = db
    .from('inquiries')
    .select('id, client_id, unknown_fields')
    .eq('tenant_id', tenantId)
    .eq('channel', opts.channel)
    .order('created_at', { ascending: false })
    .limit(20)

  if (opts.eventDate) {
    query.eq('confirmed_date', opts.eventDate)
  }

  const { data } = await query

  if (!data || data.length === 0) return null

  for (const row of data) {
    const fields = row.unknown_fields as Record<string, string> | null
    const storedName = fields?.original_sender_name || fields?.client_name || ''
    if (storedName && namesMatch(storedName, opts.clientName)) {
      return row.id
    }

    if (row.client_id) {
      const { data: client } = await db
        .from('clients')
        .select('full_name')
        .eq('id', row.client_id)
        .single()

      if (client?.full_name && namesMatch(client.full_name, opts.clientName)) {
        return row.id
      }
    }
  }

  return null
}

async function findInquiryByIdentityKeys(
  db: any,
  tenantId: string,
  channel: string,
  identityKeys: string[]
): Promise<string | null> {
  for (const identityKey of identityKeys) {
    const { data } = await db
      .from('inquiries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('external_platform', channel)
      .eq('external_inquiry_id', identityKey)
      .limit(1)
      .maybeSingle()

    if (data) return data.id

    const { data: linkMatch } = await db
      .from('inquiries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('channel', channel)
      .eq('external_link', identityKey)
      .limit(1)
      .maybeSingle()

    if (linkMatch) return linkMatch.id
  }

  const { data: candidates } = await db
    .from('inquiries')
    .select('id, external_inquiry_id, external_link, unknown_fields')
    .eq('tenant_id', tenantId)
    .eq('channel', channel)
    .order('created_at', { ascending: false })
    .limit(250)

  if (!candidates || candidates.length === 0) return null

  const candidateKeySet = new Set(identityKeys)

  for (const row of candidates) {
    const storedKeys = collectStoredPlatformIdentityKeys(row)
    if (storedKeys.some((storedKey) => candidateKeySet.has(storedKey))) {
      return row.id
    }
  }

  return null
}

// ─── Layer 0: platform_records lookup ────────────────────────────────────

/**
 * Check platform_records for an existing inquiry by external_inquiry_id or external_uri_token.
 * This is the fastest and most reliable dedup path since platform_records has unique indexes
 * on (tenant_id, platform, external_inquiry_id) and (tenant_id, platform, external_uri_token).
 */
async function findInquiryViaPlatformRecords(
  db: any,
  tenantId: string,
  channel: string,
  identityKeys: string[]
): Promise<string | null> {
  for (const key of identityKeys) {
    // Try external_inquiry_id first
    const { data: byId } = await db
      .from('platform_records')
      .select('inquiry_id')
      .eq('tenant_id', tenantId)
      .eq('platform', channel)
      .eq('external_inquiry_id', key)
      .limit(1)
      .maybeSingle()

    if (byId?.inquiry_id) return byId.inquiry_id

    // Try external_uri_token
    const { data: byToken } = await db
      .from('platform_records')
      .select('inquiry_id')
      .eq('tenant_id', tenantId)
      .eq('platform', channel)
      .eq('external_uri_token', key)
      .limit(1)
      .maybeSingle()

    if (byToken?.inquiry_id) return byToken.inquiry_id
  }

  return null
}
