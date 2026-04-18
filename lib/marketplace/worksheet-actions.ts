'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

export type CreateWorksheetInput = {
  eventId?: string
  clientId?: string
  eventDate?: string
  occasion?: string
  chefNote?: string
  expiresInDays?: number
}

export type CreateWorksheetResult = {
  success: boolean
  worksheetId?: string
  token?: string
  url?: string
  error?: string
}

export type WorksheetData = {
  id: string
  token: string
  status: string
  eventDate: string | null
  occasion: string | null
  chefNote: string | null
  clientName: string | null
  clientEmail: string | null
  clientPhone: string | null
  guestCount: number | null
  locationAddress: string | null
  dietaryRestrictions: string[]
  allergies: string[]
  preferences: string | null
  specialRequests: string | null
  completedAt: string | null
  createdAt: string
}

function generateToken(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Create a new pre-dinner worksheet and return a shareable URL.
 */
export async function createClientWorksheet(
  input: CreateWorksheetInput
): Promise<CreateWorksheetResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const token = generateToken()
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 86400000).toISOString()
    : new Date(Date.now() + 30 * 86400000).toISOString() // default 30 days

  try {
    const { data: worksheet, error } = await db
      .from('client_worksheets')
      .insert({
        tenant_id: tenantId,
        event_id: input.eventId || null,
        client_id: input.clientId || null,
        token,
        event_date: input.eventDate || null,
        occasion: input.occasion || null,
        chef_note: input.chefNote || null,
        expires_at: expiresAt,
      })
      .select('id, token')
      .single()

    if (error || !worksheet) {
      throw new Error(`Failed to create worksheet: ${error?.message}`)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
    const url = `${appUrl}/worksheet/${token}`

    revalidatePath('/events')
    if (input.eventId) revalidatePath(`/events/${input.eventId}`)

    return {
      success: true,
      worksheetId: worksheet.id,
      token: worksheet.token,
      url,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create worksheet'
    return { success: false, error: message }
  }
}

/**
 * Fetch a worksheet by its public token (no auth required).
 */
export async function getWorksheetByToken(
  token: string
): Promise<(WorksheetData & { chefSlug: string | null; chefName: string | null }) | null> {
  const db: any = createServerClient()

  const { data, error } = await db.from('client_worksheets').select('*').eq('token', token).single()

  if (error || !data) return null

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null
  }

  // Get chef slug for forward path
  let chefSlug: string | null = null
  let chefName: string | null = null
  if (data.tenant_id) {
    const { data: chef } = await db
      .from('chefs')
      .select('booking_slug, business_name')
      .eq('id', data.tenant_id)
      .single()
    if (chef) {
      chefSlug = chef.booking_slug ?? null
      chefName = chef.business_name ?? null
    }
  }

  return {
    id: data.id,
    token: data.token,
    status: data.status,
    eventDate: data.event_date,
    occasion: data.occasion,
    chefNote: data.chef_note,
    clientName: data.client_name,
    clientEmail: data.client_email,
    clientPhone: data.client_phone,
    guestCount: data.guest_count,
    locationAddress: data.location_address,
    dietaryRestrictions: data.dietary_restrictions ?? [],
    allergies: data.allergies ?? [],
    preferences: data.preferences,
    specialRequests: data.special_requests,
    completedAt: data.completed_at,
    createdAt: data.created_at,
    chefSlug,
    chefName,
  }
}

export type SubmitWorksheetInput = {
  token: string
  clientName: string
  clientEmail?: string
  clientPhone?: string
  guestCount?: number
  locationAddress?: string
  dietaryRestrictions?: string[]
  allergies?: string[]
  preferences?: string
  specialRequests?: string
}

/**
 * Client submits their completed worksheet (no auth required).
 */
export async function submitClientWorksheet(
  input: SubmitWorksheetInput
): Promise<{ success: boolean; error?: string }> {
  const db: any = createServerClient()

  // Verify the worksheet exists and is pending
  const { data: existing } = await db
    .from('client_worksheets')
    .select('id, status, expires_at, tenant_id, event_id, client_id')
    .eq('token', input.token)
    .single()

  if (!existing) return { success: false, error: 'Worksheet not found' }
  if (existing.status === 'completed') return { success: false, error: 'Already submitted' }
  if (existing.expires_at && new Date(existing.expires_at) < new Date()) {
    return { success: false, error: 'This worksheet has expired' }
  }

  const { error: updateError } = await db
    .from('client_worksheets')
    .update({
      client_name: input.clientName.trim(),
      client_email: input.clientEmail?.trim() || null,
      client_phone: input.clientPhone?.trim() || null,
      guest_count: input.guestCount || null,
      location_address: input.locationAddress?.trim() || null,
      dietary_restrictions: input.dietaryRestrictions?.filter(Boolean) || [],
      allergies: input.allergies?.filter(Boolean) || [],
      preferences: input.preferences?.trim() || null,
      special_requests: input.specialRequests?.trim() || null,
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('token', input.token)

  if (updateError) return { success: false, error: updateError.message }

  // Sync data back to client record if linked
  if (existing.client_id) {
    try {
      const updates: Record<string, unknown> = {}
      if (input.dietaryRestrictions?.length) {
        updates.dietary_restrictions = input.dietaryRestrictions.filter(Boolean)
      }
      if (input.allergies?.length) {
        updates.allergies = input.allergies.filter(Boolean)
      }
      if (input.clientEmail) updates.email = input.clientEmail.trim()
      if (input.clientPhone) updates.phone = input.clientPhone.trim()

      if (Object.keys(updates).length > 0) {
        await db
          .from('clients')
          .update(updates)
          .eq('id', existing.client_id)
          .eq('tenant_id', existing.tenant_id)
      }
    } catch (err) {
      console.error('[worksheet] Client sync failed (non-blocking):', err)
    }
  }

  // Sync guest count/location to event if linked
  if (existing.event_id) {
    try {
      const eventUpdates: Record<string, unknown> = {}
      if (input.guestCount) eventUpdates.guest_count = input.guestCount
      if (input.locationAddress) eventUpdates.location_address = input.locationAddress.trim()
      if (input.specialRequests) eventUpdates.special_requests = input.specialRequests.trim()

      if (Object.keys(eventUpdates).length > 0) {
        await db
          .from('events')
          .update(eventUpdates)
          .eq('id', existing.event_id)
          .eq('tenant_id', existing.tenant_id)
      }
    } catch (err) {
      console.error('[worksheet] Event sync failed (non-blocking):', err)
    }
  }

  return { success: true }
}

/**
 * Get all worksheets for the current chef (for listing).
 */
export async function getChefWorksheets(): Promise<WorksheetData[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data } = await db
    .from('client_worksheets')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!data) return []

  return data.map((d: any) => ({
    id: d.id,
    token: d.token,
    status: d.status,
    eventDate: d.event_date,
    occasion: d.occasion,
    chefNote: d.chef_note,
    clientName: d.client_name,
    clientEmail: d.client_email,
    clientPhone: d.client_phone,
    guestCount: d.guest_count,
    locationAddress: d.location_address,
    dietaryRestrictions: d.dietary_restrictions ?? [],
    allergies: d.allergies ?? [],
    preferences: d.preferences,
    specialRequests: d.special_requests,
    completedAt: d.completed_at,
    createdAt: d.created_at,
  }))
}
