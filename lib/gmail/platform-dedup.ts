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

import type { SupabaseClient } from '@supabase/supabase-js'

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
  supabase: SupabaseClient,
  tenantId: string,
  opts: {
    channel: string
    externalId?: string | null
    clientName: string
    eventDate: string | null
  }
): Promise<PlatformDedupMatch> {
  const noMatch: PlatformDedupMatch = {
    isDuplicate: false,
    existingInquiryId: null,
    matchedBy: null,
  }

  // Strategy 1: Match by external inquiry ID (most reliable)
  if (opts.externalId) {
    const { data } = await supabase
      .from('inquiries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('external_platform', opts.channel)
      .eq('external_inquiry_id', opts.externalId)
      .limit(1)
      .maybeSingle()

    if (data) {
      return { isDuplicate: true, existingInquiryId: data.id, matchedBy: 'external_id' }
    }

    // Also check external_link (some platforms store the URL there)
    const { data: linkMatch } = await supabase
      .from('inquiries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('channel', opts.channel)
      .eq('external_link', opts.externalId)
      .limit(1)
      .maybeSingle()

    if (linkMatch) {
      return { isDuplicate: true, existingInquiryId: linkMatch.id, matchedBy: 'external_id' }
    }
  }

  // Strategy 2: Match by client name + date (fuzzy — for when we don't have an external ID)
  if (opts.clientName && opts.eventDate) {
    const { data } = await supabase
      .from('inquiries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('channel', opts.channel)
      .eq('confirmed_date', opts.eventDate)
      .limit(10)

    if (data && data.length > 0) {
      for (const row of data) {
        const { data: inquiry } = await supabase
          .from('inquiries')
          .select('id, client_id, source_message, unknown_fields')
          .eq('id', row.id)
          .single()

        if (!inquiry) continue

        const fields = inquiry.unknown_fields as Record<string, string> | null
        const storedName = fields?.original_sender_name || fields?.client_name || ''
        if (storedName && namesMatch(storedName, opts.clientName)) {
          return { isDuplicate: true, existingInquiryId: inquiry.id, matchedBy: 'name_and_date' }
        }

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
 * Find an existing platform inquiry by context (order ID, client name, date).
 * Used for matching follow-up emails (messages, bookings, customer info) to existing inquiries.
 */
export async function findPlatformInquiryByContext(
  supabase: SupabaseClient,
  tenantId: string,
  opts: {
    channel: string
    clientName: string | null
    eventDate: string | null
    orderId: string | null
  }
): Promise<string | null> {
  // First try by Order/Quote ID (stored as external_inquiry_id)
  if (opts.orderId) {
    const { data } = await supabase
      .from('inquiries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('external_platform', opts.channel)
      .eq('external_inquiry_id', opts.orderId)
      .limit(1)
      .maybeSingle()

    if (data) return data.id

    // Also check external_link
    const { data: linkMatch } = await supabase
      .from('inquiries')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('channel', opts.channel)
      .eq('external_link', opts.orderId)
      .limit(1)
      .maybeSingle()

    if (linkMatch) return linkMatch.id
  }

  // Fall back to client name + date matching
  if (!opts.clientName) return null

  const query = supabase
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
