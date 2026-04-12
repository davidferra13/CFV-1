'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { addDays, isBefore } from 'date-fns'
import { isTempSafe, isInDangerZone, getCookingTemp } from '@/lib/constants/food-safety'

// ============================================
// CERTIFICATIONS
// ============================================

const CertificationSchema = z.object({
  cert_type: z.enum([
    'food_handler',
    'servsafe_manager',
    'allergen_awareness',
    'llc',
    'business_license',
    'liability_insurance',
    'cottage_food',
    'other',
  ]),
  name: z.string().min(1, 'Name is required'),
  issuing_body: z.string().optional(),
  issued_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  reminder_days_before: z.number().int().min(0).default(30),
  cert_number: z.string().optional(),
  document_url: z.string().url().optional().or(z.literal('')),
  status: z.enum(['active', 'expired', 'pending_renewal']).default('active'),
})

export type CertificationInput = z.infer<typeof CertificationSchema>

export async function createCertification(input: CertificationInput) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const data = CertificationSchema.parse(input)

  const { error } = await db.from('chef_certifications').insert({
    ...data,
    chef_id: chef.id,
    document_url: data.document_url || null,
    issued_date: data.issued_date || null,
    expiry_date: data.expiry_date || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/settings/compliance')
}

export async function updateCertification(id: string, input: CertificationInput) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const data = CertificationSchema.parse(input)

  const { error } = await db
    .from('chef_certifications')
    .update({
      ...data,
      document_url: data.document_url || null,
      issued_date: data.issued_date || null,
      expiry_date: data.expiry_date || null,
    })
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/compliance')
}

export async function deleteCertification(id: string) {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_certifications')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/compliance')
}

export async function listCertifications() {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_certifications')
    .select('*')
    .eq('chef_id', chef.id)
    .order('expiry_date', { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getExpiringCertifications(daysAhead = 60) {
  const chef = await requireChef()
  const db: any = createServerClient()

  const today = new Date()
  const _liso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const threshold = _liso(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysAhead)
  )
  const todayStr = _liso(today)

  const { data, error } = await db
    .from('chef_certifications')
    .select('*')
    .eq('chef_id', chef.id)
    .eq('status', 'active')
    .not('expiry_date', 'is', null)
    .lte('expiry_date', threshold)
    .gte('expiry_date', todayStr)
    .order('expiry_date', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

// ============================================
// TEMPERATURE LOGS
// ============================================

const TempLogSchema = z.object({
  event_id: z.string().uuid(),
  item_description: z.string().min(1, 'Item description is required'),
  temp_fahrenheit: z.number(),
  phase: z.enum(['receiving', 'cold_holding', 'hot_holding', 'cooling', 'reheating']),
  is_safe: z.boolean().optional(),
  notes: z.string().optional(),
})

export type TempLogInput = z.infer<typeof TempLogSchema>

// NOTE: SAFE_TEMP_RANGES has been moved to './constants' - import from there instead.

export async function logTemperature(input: TempLogInput) {
  const chef = await requireChef()
  const db: any = createServerClient()
  const data = TempLogSchema.parse(input)

  // Auto-determine safety using FDA Food Code reference data if not explicitly set
  let isSafe = data.is_safe
  if (isSafe === undefined || isSafe === null) {
    if (data.phase === 'cold_holding') {
      // Cold holding: must be at or below 41F
      isSafe = data.temp_fahrenheit <= 41
    } else if (data.phase === 'hot_holding') {
      // Hot holding: must be at or above 135F
      isSafe = data.temp_fahrenheit >= 135
    } else if (data.phase === 'cooling') {
      // Cooling: not in danger zone is ideal, but context matters
      isSafe = !isInDangerZone(data.temp_fahrenheit)
    } else if (data.phase === 'reheating') {
      // Reheating: must reach 165F
      isSafe = data.temp_fahrenheit >= 165
    } else {
      // Receiving or cooking: check against the specific item's required temp
      const result = isTempSafe(data.item_description, data.temp_fahrenheit)
      isSafe = result.safe
    }
  }

  const { error } = await db.from('event_temp_logs').insert({
    ...data,
    is_safe: isSafe,
    chef_id: chef.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${data.event_id}`)
}

export async function deleteTempLog(id: string) {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('event_temp_logs').delete().eq('id', id).eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
}

export async function getEventTempLog(eventId: string) {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_temp_logs')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', chef.id)
    .order('logged_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

// ============================================
// ALLERGEN RISK SUMMARY
// ============================================

export async function getAllergenRiskSummary(eventId: string) {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Get event + linked client
  const { data: event, error: evErr } = await db
    .from('events')
    .select('id, client_id, menu_id')
    .eq('id', eventId)
    .eq('tenant_id', chef.tenantId!)
    .single()

  if (evErr || !event) throw new Error('Event not found')

  // Get client dietary restrictions / allergies
  const { data: client } = await db
    .from('clients')
    .select('full_name, dietary_restrictions, allergies')
    .eq('id', event.client_id)
    .single()

  // Get menu dishes if menu is linked (dishes table has allergen_flags)
  let dishes: Array<{ name: string; allergens: string[] }> = []
  if (event.menu_id) {
    const { data: menuDishes } = await db
      .from('dishes' as any)
      .select('name, allergen_flags')
      .eq('menu_id', event.menu_id)
      .not('name', 'is', null)

    dishes = (menuDishes ?? []).map((d: any) => ({
      name: d.name ?? 'Unnamed dish',
      allergens: Array.isArray(d.allergen_flags) ? d.allergen_flags : [],
    }))
  }

  return {
    clientName: client?.full_name ?? 'Unknown client',
    dietaryRestrictions: client?.dietary_restrictions ?? null,
    allergies: (client as { allergies?: string } | null)?.allergies ?? null,
    menuDishes: dishes,
    hasAllergenConcerns: !!(
      client?.dietary_restrictions || (client as { allergies?: string } | null)?.allergies
    ),
  }
}
