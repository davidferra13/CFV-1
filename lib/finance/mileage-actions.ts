'use server'

// Mileage Log Actions — per-event mileage entries for tax deduction tracking.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface MileageEntry {
  id: string
  eventId: string | null
  tripDate: string
  description: string
  miles: number
  irsRateCents: number
  deductionCents: number
}

export async function getMileageLogs(eventId?: string): Promise<MileageEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('mileage_logs' as any)
    .select('id, event_id, trip_date, description, miles, irs_rate_cents, deduction_cents')
    .eq('tenant_id', user.tenantId!)
    .order('trip_date', { ascending: false })

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data } = await query

  return ((data ?? []) as any[]).map((r: any): MileageEntry => ({
    id: r.id,
    eventId: r.event_id,
    tripDate: r.trip_date,
    description: r.description,
    miles: Number(r.miles),
    irsRateCents: r.irs_rate_cents,
    deductionCents: r.deduction_cents,
  }))
}

export async function getYtdMileageSummary(): Promise<{ totalMiles: number; totalDeductionCents: number }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const year = new Date().getFullYear()

  const { data } = await supabase
    .from('mileage_logs' as any)
    .select('miles, deduction_cents')
    .eq('tenant_id', user.tenantId!)
    .gte('trip_date', `${year}-01-01`)
    .lt('trip_date', `${year + 1}-01-01`)

  let totalMiles = 0
  let totalDeductionCents = 0
  for (const r of (data ?? []) as any[]) {
    totalMiles += Number(r.miles)
    totalDeductionCents += Number(r.deduction_cents)
  }

  return { totalMiles, totalDeductionCents }
}

export async function addMileageEntry(formData: FormData): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const eventId = (formData.get('eventId') as string) || null
  const tripDate = formData.get('tripDate') as string
  const description = formData.get('description') as string
  const miles = parseFloat(formData.get('miles') as string)

  if (!tripDate || !description || isNaN(miles) || miles <= 0) return

  await supabase.from('mileage_logs' as any).insert({
    tenant_id: user.tenantId!,
    event_id: eventId,
    trip_date: tripDate,
    description,
    miles,
  })

  if (eventId) revalidatePath(`/events/${eventId}`)
  revalidatePath('/finance/mileage')
}

export async function deleteMileageEntry(id: string, eventId?: string | null): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  await supabase
    .from('mileage_logs' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (eventId) revalidatePath(`/events/${eventId}`)
  revalidatePath('/finance/mileage')
}
