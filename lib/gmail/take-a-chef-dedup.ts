// TakeAChef Inquiry-Level Deduplication
// Prevents creating duplicate inquiries when TakeAChef sends the same
// notification email multiple times (different Gmail message IDs, same inquiry).
//
// Layer 1 (gmail_sync_log unique constraint) handles email-level dedup.
// This module handles Layer 2: inquiry-level dedup by matching on
// external_inquiry_id OR client name + date.
//
// Rule: NEVER overwrite or delete an existing inquiry. Duplicates are skipped.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface TacDedupMatch {
  isDuplicate: boolean
  existingInquiryId: string | null
  matchedBy: 'external_id' | 'name_and_date' | null
}

/**
 * Check if a TakeAChef inquiry already exists in the database.
 *
 * Strategy:
 * 1. If externalId is provided, check by (tenant_id, external_platform, external_inquiry_id)
 * 2. Fallback: check by client name (case-insensitive) + confirmed_date within same tenant
 *
 * Returns the existing inquiry ID if found, or null if this is a new inquiry.
 */
export async function checkTacInquiryDuplicate(
  supabase: SupabaseClient,
  tenantId: string,
  opts: {
    externalId?: string | null
    clientName: string
    eventDate: string | null
  }
): Promise<TacDedupMatch> {
  const noMatch: TacDedupMatch = { isDuplicate: false, existingInquiryId: null, matchedBy: null }

  // Strategy 1: Match by external inquiry ID (most reliable)
  if (opts.externalId) {
    const { data } = await supabase
      .from('inquiries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('external_platform', 'take_a_chef')
      .eq('external_inquiry_id', opts.externalId)
      .limit(1)
      .maybeSingle()

    if (data) {
      return { isDuplicate: true, existingInquiryId: data.id, matchedBy: 'external_id' }
    }
  }

  // Strategy 2: Match by client name + date (fuzzy — for when we don't have an external ID)
  if (opts.clientName && opts.eventDate) {
    const { data } = await supabase
      .from('inquiries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('channel', 'take_a_chef')
      .eq('confirmed_date', opts.eventDate)
      .limit(10) // Fetch a few to do case-insensitive name matching

    if (data && data.length > 0) {
      // We need to do a name match. Since we can't easily do case-insensitive
      // matching on unknown_fields.client_name in the query, we check a broader
      // set: inquiries with the same channel + date, then match name.
      // For TakeAChef inquiries, the client name is stored in the linked client record.
      // But we also store it in source_message. For a reliable match, we'll also
      // check against the unknown_fields.original_sender_name or the linked client name.

      // For now, if we find any TakeAChef inquiry with the same date,
      // do a secondary name lookup
      for (const row of data) {
        const { data: inquiry } = await supabase
          .from('inquiries')
          .select('id, client_id, source_message, unknown_fields')
          .eq('id', row.id)
          .single()

        if (!inquiry) continue

        // Check source_message for the client name
        const fields = inquiry.unknown_fields as Record<string, string> | null
        const storedName = fields?.original_sender_name || fields?.client_name || ''
        if (storedName && namesMatch(storedName, opts.clientName)) {
          return { isDuplicate: true, existingInquiryId: inquiry.id, matchedBy: 'name_and_date' }
        }

        // Check linked client name
        if (inquiry.client_id) {
          const { data: client } = await supabase
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
 * Find an existing TakeAChef inquiry by client name + approximate date.
 * Used for matching message/booking/customer-info emails to existing inquiries.
 */
export async function findTacInquiryByContext(
  supabase: SupabaseClient,
  tenantId: string,
  opts: {
    clientName: string | null
    eventDate: string | null
    orderId: string | null
  }
): Promise<string | null> {
  // First try by Order ID (stored as external_inquiry_id after booking confirmation)
  if (opts.orderId) {
    const { data } = await supabase
      .from('inquiries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('external_platform', 'take_a_chef')
      .eq('external_inquiry_id', opts.orderId)
      .limit(1)
      .maybeSingle()

    if (data) return data.id
  }

  // Fall back to client name + date matching
  if (!opts.clientName) return null

  const query = supabase
    .from('inquiries')
    .select('id, client_id, unknown_fields')
    .eq('tenant_id', tenantId)
    .eq('channel', 'take_a_chef')
    .order('created_at', { ascending: false })
    .limit(20)

  // If we have a date, filter by it
  if (opts.eventDate) {
    query.eq('confirmed_date', opts.eventDate)
  }

  const { data } = await query

  if (!data || data.length === 0) return null

  // Match by name
  for (const row of data) {
    const fields = row.unknown_fields as Record<string, string> | null
    const storedName = fields?.original_sender_name || fields?.client_name || ''
    if (storedName && namesMatch(storedName, opts.clientName)) {
      return row.id
    }

    // Check linked client
    if (row.client_id) {
      const { data: client } = await supabase
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

// ─── Name Matching ──────────────────────────────────────────────────────

/**
 * Case-insensitive name comparison with basic normalization.
 * Handles: extra spaces, different casing, minor variations.
 */
function namesMatch(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  return normalize(a) === normalize(b)
}
