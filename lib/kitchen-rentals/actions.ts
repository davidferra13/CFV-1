'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const KitchenRentalSchema = z.object({
  facility_name: z.string().min(1, 'Facility name is required'),
  address: z.string().optional(),
  rental_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  hours_booked: z.number().positive().optional(),
  cost_cents: z.number().int().min(0),
  purpose: z.string().optional(),
  event_id: z.string().uuid().optional(),
  booking_confirmation: z.string().optional(),
  notes: z.string().optional(),
})

export type KitchenRentalInput = z.infer<typeof KitchenRentalSchema>

export async function createKitchenRental(input: KitchenRentalInput) {
  const chef = await requireChef()
  const supabase = createServerClient()
  const data = KitchenRentalSchema.parse(input)

  const { error } = await supabase.from('kitchen_rentals').insert({ ...data, chef_id: chef.id })

  if (error) throw new Error(error.message)
  revalidatePath('/operations/kitchen-rentals')
}

export async function updateKitchenRental(id: string, input: KitchenRentalInput) {
  const chef = await requireChef()
  const supabase = createServerClient()
  const data = KitchenRentalSchema.parse(input)

  const { error } = await supabase
    .from('kitchen_rentals')
    .update(data)
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/operations/kitchen-rentals')
}

export async function deleteKitchenRental(id: string) {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('kitchen_rentals')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/operations/kitchen-rentals')
}

export async function listKitchenRentals(limit = 50) {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('kitchen_rentals')
    .select('*')
    .eq('chef_id', chef.id)
    .order('rental_date', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getKitchenRentalsForEvent(eventId: string) {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('kitchen_rentals')
    .select('*')
    .eq('chef_id', chef.id)
    .eq('event_id', eventId)
    .order('rental_date', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getMonthlyKitchenCosts(year: number, month: number) {
  const chef = await requireChef()
  const supabase = createServerClient()

  // Build date range for the month
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = new Date(year, month, 0).toISOString().slice(0, 10) // last day

  const { data, error } = await supabase
    .from('kitchen_rentals')
    .select('cost_cents, facility_name, rental_date, hours_booked')
    .eq('chef_id', chef.id)
    .gte('rental_date', start)
    .lte('rental_date', end)

  if (error) throw new Error(error.message)

  const rows = data ?? []
  const totalCents = rows.reduce((sum: number, r: any) => sum + (r.cost_cents ?? 0), 0)
  const totalHours = rows.reduce((sum: number, r: any) => sum + (r.hours_booked ?? 0), 0)

  return {
    rentals: rows,
    totalCents,
    totalHours,
    count: rows.length,
  }
}
