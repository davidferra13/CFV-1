// Discovery Fields Server Actions
// CRUD for event discovery/atmosphere fields and vendor coordination.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  DiscoveryFields,
  EventVendor,
  VendorInput,
  SocialMediaConsent,
} from './discovery-types'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const DiscoveryFieldsSchema = z.object({
  dress_code: z.string().max(500).nullable().optional(),
  table_presentation: z.string().max(500).nullable().optional(),
  surprise_details: z
    .object({
      isSurprise: z.boolean(),
      honoree: z.string().max(200),
      coordinationNotes: z.string().max(2000),
    })
    .nullable()
    .optional(),
  social_media_consent: z.enum(['full', 'restricted', 'none', 'undiscussed']).nullable().optional(),
  vibe_atmosphere: z.string().max(1000).nullable().optional(),
  vendor_coordination_notes: z.string().max(2000).nullable().optional(),
  confidentiality_required: z.boolean().optional(),
})

const VendorInputSchema = z.object({
  vendor_type: z.enum([
    'florist',
    'photographer',
    'dj',
    'rental',
    'linen',
    'av',
    'decor',
    'entertainment',
    'transport',
    'other',
  ]),
  vendor_name: z.string().min(1).max(200),
  contact_name: z.string().max(200).nullable().optional(),
  contact_phone: z.string().max(30).nullable().optional(),
  contact_email: z.string().email().max(200).nullable().optional(),
  arrival_time: z.string().max(10).nullable().optional(),
  departure_time: z.string().max(10).nullable().optional(),
  cost_cents: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

// ─── Discovery Fields ────────────────────────────────────────────────────────

export async function getDiscoveryFields(eventId: string): Promise<DiscoveryFields | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('events')
    .select(
      'dress_code, table_presentation, surprise_details, social_media_consent, vibe_atmosphere, vendor_coordination_notes, confidentiality_required'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) return null

  return {
    dress_code: data.dress_code ?? null,
    table_presentation: data.table_presentation ?? null,
    surprise_details: data.surprise_details ?? null,
    social_media_consent: (data.social_media_consent as SocialMediaConsent) ?? null,
    vibe_atmosphere: data.vibe_atmosphere ?? null,
    vendor_coordination_notes: data.vendor_coordination_notes ?? null,
    confidentiality_required: data.confidentiality_required ?? false,
  }
}

export async function updateDiscoveryFields(
  eventId: string,
  fields: Partial<DiscoveryFields>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const parsed = DiscoveryFieldsSchema.parse(fields)

  // Build update payload, only including provided fields
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.dress_code !== undefined) update.dress_code = parsed.dress_code || null
  if (parsed.table_presentation !== undefined)
    update.table_presentation = parsed.table_presentation || null
  if (parsed.surprise_details !== undefined) update.surprise_details = parsed.surprise_details
  if (parsed.social_media_consent !== undefined)
    update.social_media_consent = parsed.social_media_consent
  if (parsed.vibe_atmosphere !== undefined) update.vibe_atmosphere = parsed.vibe_atmosphere || null
  if (parsed.vendor_coordination_notes !== undefined)
    update.vendor_coordination_notes = parsed.vendor_coordination_notes || null
  if (parsed.confidentiality_required !== undefined)
    update.confidentiality_required = parsed.confidentiality_required

  const { error } = await db
    .from('events')
    .update(update)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[discovery] update failed', error)
    return { success: false, error: 'Failed to save discovery fields' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// ─── Vendor CRUD ─────────────────────────────────────────────────────────────

export async function getEventVendors(eventId: string): Promise<EventVendor[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_vendors')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as EventVendor[]
}

export async function addEventVendor(
  eventId: string,
  vendor: VendorInput
): Promise<{ success: boolean; vendor?: EventVendor; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const parsed = VendorInputSchema.parse(vendor)

  const { data, error } = await db
    .from('event_vendors')
    .insert({
      event_id: eventId,
      tenant_id: user.tenantId!,
      vendor_type: parsed.vendor_type,
      vendor_name: parsed.vendor_name,
      contact_name: parsed.contact_name || null,
      contact_phone: parsed.contact_phone || null,
      contact_email: parsed.contact_email || null,
      arrival_time: parsed.arrival_time || null,
      departure_time: parsed.departure_time || null,
      cost_cents: parsed.cost_cents ?? null,
      notes: parsed.notes || null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[discovery] add vendor failed', error)
    return { success: false, error: 'Failed to add vendor' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true, vendor: data as EventVendor }
}

export async function updateEventVendor(
  vendorId: string,
  updates: Partial<VendorInput>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const parsed = VendorInputSchema.partial().parse(updates)

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.vendor_type !== undefined) update.vendor_type = parsed.vendor_type
  if (parsed.vendor_name !== undefined) update.vendor_name = parsed.vendor_name
  if (parsed.contact_name !== undefined) update.contact_name = parsed.contact_name || null
  if (parsed.contact_phone !== undefined) update.contact_phone = parsed.contact_phone || null
  if (parsed.contact_email !== undefined) update.contact_email = parsed.contact_email || null
  if (parsed.arrival_time !== undefined) update.arrival_time = parsed.arrival_time || null
  if (parsed.departure_time !== undefined) update.departure_time = parsed.departure_time || null
  if (parsed.cost_cents !== undefined) update.cost_cents = parsed.cost_cents ?? null
  if (parsed.notes !== undefined) update.notes = parsed.notes || null

  const { error } = await db
    .from('event_vendors')
    .update(update)
    .eq('id', vendorId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[discovery] update vendor failed', error)
    return { success: false, error: 'Failed to update vendor' }
  }

  revalidatePath('/events')
  return { success: true }
}

export async function removeEventVendor(
  vendorId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('event_vendors')
    .delete()
    .eq('id', vendorId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[discovery] remove vendor failed', error)
    return { success: false, error: 'Failed to remove vendor' }
  }

  revalidatePath('/events')
  return { success: true }
}

export async function confirmVendor(
  vendorId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('event_vendors')
    .update({
      confirmed: true,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', vendorId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[discovery] confirm vendor failed', error)
    return { success: false, error: 'Failed to confirm vendor' }
  }

  revalidatePath('/events')
  return { success: true }
}
