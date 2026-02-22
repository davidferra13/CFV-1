// Equipment Inventory — Server Actions
// Tracks owned equipment (with maintenance) and rental costs per event.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { addDays, format, isBefore } from 'date-fns'

const CATEGORIES = [
  'cookware',
  'knives',
  'smallwares',
  'appliances',
  'serving',
  'transport',
  'linen',
  'other',
] as const

const CreateEquipmentSchema = z.object({
  name: z.string().min(1, 'Name required'),
  category: z.enum(CATEGORIES).default('other'),
  purchase_date: z.string().nullable().optional(),
  purchase_price_cents: z.number().int().min(0).nullable().optional(),
  current_value_cents: z.number().int().min(0).nullable().optional(),
  serial_number: z.string().nullable().optional(),
  notes: z.string().optional(),
  maintenance_interval_days: z.number().int().positive().nullable().optional(),
})

const RentalSchema = z.object({
  equipment_name: z.string().min(1, 'Item name required'),
  vendor_name: z.string().nullable().optional(),
  rental_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  return_date: z.string().nullable().optional(),
  cost_cents: z.number().int().min(0),
  event_id: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
})

export type CreateEquipmentInput = z.infer<typeof CreateEquipmentSchema>
export type RentalInput = z.infer<typeof RentalSchema>
// EQUIPMENT_CATEGORIES exported from lib/equipment/constants.ts

// ============================================
// OWNED EQUIPMENT
// ============================================

export async function createEquipmentItem(input: CreateEquipmentInput) {
  const user = await requireChef()
  const validated = CreateEquipmentSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('equipment_items')
    .insert({ chef_id: user.tenantId!, ...validated })
    .select()
    .single()

  if (error) throw new Error('Failed to add equipment item')
  revalidatePath('/operations/equipment')
  return data
}

export async function updateEquipmentItem(id: string, input: Partial<CreateEquipmentInput>) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('equipment_items')
    .update(input)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error('Failed to update equipment item')
  revalidatePath('/operations/equipment')
  return data
}

export async function retireEquipmentItem(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()
  await supabase
    .from('equipment_items')
    .update({ status: 'retired' })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
  revalidatePath('/operations/equipment')
}

export async function logMaintenance(id: string, notes?: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const today = format(new Date(), 'yyyy-MM-dd')
  const { error } = await supabase
    .from('equipment_items')
    .update({ last_maintained_at: today })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to log maintenance')
  revalidatePath('/operations/equipment')
}

export async function listEquipment(category?: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('equipment_items')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'owned')
    .order('category')
    .order('name')

  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) throw new Error('Failed to load equipment')
  return data ?? []
}

/**
 * Returns equipment where next maintenance date (last_maintained + interval) has passed.
 */
export async function getEquipmentDueForMaintenance() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('equipment_items')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'owned')
    .not('maintenance_interval_days', 'is', null)

  const today = new Date()
  return (data ?? []).filter((item: any) => {
    if (!item.maintenance_interval_days) return false
    if (!item.last_maintained_at) return true // never maintained — overdue
    const nextDue = addDays(new Date(item.last_maintained_at), item.maintenance_interval_days)
    return isBefore(nextDue, today)
  })
}

// ============================================
// EQUIPMENT RENTALS
// ============================================

export async function logRental(input: RentalInput) {
  const user = await requireChef()
  const validated = RentalSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('equipment_rentals')
    .insert({ chef_id: user.tenantId!, ...validated })
    .select()
    .single()

  if (error) throw new Error('Failed to log rental')
  revalidatePath('/operations/equipment')
  if (validated.event_id) revalidatePath(`/events/${validated.event_id}`)
  return data
}

export async function deleteRental(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()
  await supabase.from('equipment_rentals').delete().eq('id', id).eq('chef_id', user.tenantId!)
  revalidatePath('/operations/equipment')
}

export async function getRentalCostForEvent(eventId: string): Promise<number> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('equipment_rentals')
    .select('cost_cents')
    .eq('chef_id', user.tenantId!)
    .eq('event_id', eventId)

  return (data ?? []).reduce((sum: number, r: any) => sum + (r.cost_cents ?? 0), 0)
}

export async function listRentals(eventId?: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('equipment_rentals')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('rental_date', { ascending: false })

  if (eventId) query = query.eq('event_id', eventId)

  const { data } = await query
  return data ?? []
}
