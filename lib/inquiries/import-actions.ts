// Bulk Inquiry Import Server Actions
// Imports historical inquiries into the database.
// Unlike createInquiry(), this accepts custom dates and statuses
// and skips all side effects (no automations, no AI scoring, no emails).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database, Json } from '@/types/database'

type InquiryStatus = Database['public']['Enums']['inquiry_status']
type InquiryChannel = Database['public']['Enums']['inquiry_channel']

// ============================================
// VALIDATION
// ============================================

const VALID_STATUSES: InquiryStatus[] = ['new', 'confirmed', 'declined', 'expired']
const VALID_CHANNELS: InquiryChannel[] = [
  'text',
  'email',
  'instagram',
  'take_a_chef',
  'phone',
  'website',
  'referral',
  'walk_in',
  'wix',
  'campaign_response',
  'outbound_prospecting',
  'other',
]

const ImportInquirySchema = z.object({
  client_name: z.string().min(1, 'Client name required'),
  client_email: z.string().email().optional().or(z.literal('')).or(z.literal(null)).nullable(),
  client_phone: z.string().optional().or(z.literal('')).or(z.literal(null)).nullable(),
  channel: z.string().default('other'),
  status: z.string().default('new'),
  first_contact_at: z.string().optional().or(z.literal('')),
  confirmed_date: z.string().optional().or(z.literal('')).nullable(),
  confirmed_guest_count: z.number().int().positive().nullable().optional(),
  confirmed_location: z.string().optional().or(z.literal('')).nullable(),
  confirmed_occasion: z.string().optional().or(z.literal('')).nullable(),
  confirmed_budget_cents: z.number().int().nonnegative().nullable().optional(),
  confirmed_dietary_restrictions: z.array(z.string()).nullable().optional(),
  source_message: z.string().optional().or(z.literal('')).nullable(),
  notes: z.string().optional().or(z.literal('')).nullable(),
  decline_reason: z.string().optional().or(z.literal('')).nullable(),
})

export type ImportInquiryInput = z.infer<typeof ImportInquirySchema>

export type ImportInquiriesResult = {
  imported: number
  failed: number
  errors: string[]
}

// ============================================
// DUPLICATE CHECK
// ============================================

export async function checkInquiryDuplicates(
  candidates: { client_name: string; first_contact_at: string }[]
): Promise<Map<string, boolean>> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Build a map: "name|date" → is duplicate
  const results = new Map<string, boolean>()

  // Fetch all existing inquiries for this tenant (name + date pairs)
  const { data: existing } = await supabase
    .from('inquiries')
    .select('unknown_fields, confirmed_date, first_contact_at, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)

  if (!existing || existing.length === 0) {
    for (const c of candidates) {
      results.set(`${c.client_name}|${c.first_contact_at}`, false)
    }
    return results
  }

  // Build lookup set of existing name+date combos
  const existingSet = new Set<string>()
  for (const inq of existing) {
    const clientName =
      (inq.client as { full_name: string } | null)?.full_name ||
      (inq.unknown_fields as Record<string, string> | null)?.client_name ||
      ''
    const date = inq.confirmed_date || inq.first_contact_at?.slice(0, 10) || ''
    if (clientName) {
      existingSet.add(`${clientName.toLowerCase()}|${date}`)
    }
  }

  for (const c of candidates) {
    const key = `${c.client_name.toLowerCase()}|${c.first_contact_at}`
    results.set(`${c.client_name}|${c.first_contact_at}`, existingSet.has(key))
  }

  return results
}

// ============================================
// IMPORT SINGLE INQUIRY
// ============================================

async function importSingleInquiry(
  input: ImportInquiryInput,
  tenantId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase: any = createServerClient()

  const validated = ImportInquirySchema.parse(input)

  // Normalize channel and status to valid enum values
  const channel: InquiryChannel = VALID_CHANNELS.includes(validated.channel as InquiryChannel)
    ? (validated.channel as InquiryChannel)
    : 'other'

  const status: InquiryStatus = VALID_STATUSES.includes(validated.status as InquiryStatus)
    ? (validated.status as InquiryStatus)
    : 'new'

  // Auto-link client by email (same logic as createInquiry)
  let clientId: string | null = null

  if (validated.client_email) {
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', validated.client_email)
      .single()

    if (existingClient) {
      clientId = existingClient.id
    }
  }

  // Build unknown_fields for unlinked lead info
  const unknownFields: Record<string, string> = {}
  if (!clientId) {
    unknownFields.client_name = validated.client_name
    if (validated.client_email) unknownFields.client_email = validated.client_email
    if (validated.client_phone) unknownFields.client_phone = validated.client_phone
  }
  if (validated.notes) unknownFields.notes = validated.notes

  // Determine first_contact_at - use provided date, fall back to now
  const firstContactAt = validated.first_contact_at
    ? new Date(validated.first_contact_at).toISOString()
    : new Date().toISOString()

  // Insert inquiry
  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .insert({
      tenant_id: tenantId,
      channel,
      status,
      client_id: clientId,
      first_contact_at: firstContactAt,
      confirmed_date: validated.confirmed_date || validated.first_contact_at || null,
      confirmed_guest_count: validated.confirmed_guest_count ?? null,
      confirmed_location: validated.confirmed_location || null,
      confirmed_occasion: validated.confirmed_occasion || null,
      confirmed_budget_cents: validated.confirmed_budget_cents ?? null,
      confirmed_dietary_restrictions: validated.confirmed_dietary_restrictions ?? null,
      source_message: validated.source_message || null,
      decline_reason: status === 'declined' ? validated.decline_reason || null : null,
      unknown_fields:
        Object.keys(unknownFields).length > 0 ? (unknownFields as unknown as Json) : null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[importInquiry] Insert error:', error)
    return {
      success: false,
      error: `Failed to import "${validated.client_name}": ${error.message}`,
    }
  }

  // Insert initial state transition (no side effects - just the record)
  try {
    await supabase.from('inquiry_state_transitions').insert({
      inquiry_id: inquiry.id,
      tenant_id: tenantId,
      from_status: null,
      to_status: status,
      transitioned_by: userId,
      metadata: { action: 'bulk_import' } as unknown as Json,
    })
  } catch (err) {
    // Non-blocking - the inquiry was created successfully
    console.error('[importInquiry] State transition insert failed (non-blocking):', err)
  }

  return { success: true }
}

// ============================================
// BATCH IMPORT
// ============================================

export async function importInquiries(
  inputs: ImportInquiryInput[]
): Promise<ImportInquiriesResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  let imported = 0
  let failed = 0
  const errors: string[] = []

  for (const input of inputs) {
    try {
      const result = await importSingleInquiry(input, tenantId, user.id)
      if (result.success) {
        imported++
      } else {
        failed++
        if (result.error) errors.push(result.error)
      }
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`Failed to import "${input.client_name}": ${msg}`)
    }
  }

  revalidatePath('/inquiries')

  return { imported, failed, errors }
}
