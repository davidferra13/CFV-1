'use server'

// Mileage Tracking Actions
// IRS 2026 standard mileage rate: 72.5 cents/mile
// All deduction amounts computed at the precise rate, stored in cents.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// IRS 2026 standard mileage rate
const IRS_RATE_PER_MILE = 72.5 // cents

export type MileagePurpose =
  | 'client_service'
  | 'grocery_shopping'
  | 'event_prep'
  | 'consultation'
  | 'delivery'
  | 'other'

export const MILEAGE_PURPOSE_LABELS: Record<MileagePurpose, string> = {
  client_service: 'Client Service',
  grocery_shopping: 'Grocery Shopping',
  event_prep: 'Event Prep',
  consultation: 'Consultation',
  delivery: 'Delivery',
  other: 'Other',
}

export interface MileageEntry {
  id: string
  eventId: string | null
  tripDate: string
  purpose: MileagePurpose
  fromLocation: string | null
  toLocation: string | null
  miles: number
  deductionCents: number
  description: string | null
  notes: string | null
  createdAt: string
}

export interface MileagePurposeBreakdown {
  purpose: MileagePurpose
  label: string
  totalMiles: number
  tripCount: number
  deductionCents: number
}

export interface MileageMonthBreakdown {
  month: number // 1-12
  totalMiles: number
  tripCount: number
  deductionCents: number
}

export interface MileageSummary {
  year: number
  totalMiles: number
  totalDeductionCents: number
  totalTrips: number
  byPurpose: MileagePurposeBreakdown[]
  byMonth: MileageMonthBreakdown[]
  ratePerMile: number
}

function computeDeduction(miles: number): number {
  return Math.round(miles * IRS_RATE_PER_MILE)
}

function mapRow(r: any): MileageEntry {
  const miles = Number(r.miles)
  return {
    id: r.id,
    eventId: r.event_id,
    tripDate: r.trip_date,
    purpose: r.purpose || 'other',
    fromLocation: r.from_location,
    toLocation: r.to_location,
    miles,
    deductionCents: computeDeduction(miles),
    description: r.description,
    notes: r.notes,
    createdAt: r.created_at,
  }
}

// ---------------------------------------------------------------------------
// Add a mileage log entry
// ---------------------------------------------------------------------------
export async function addMileageLog(data: {
  eventId?: string | null
  tripDate: string
  purpose: MileagePurpose
  fromLocation?: string
  toLocation?: string
  miles: number
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (!data.tripDate || !data.miles || data.miles <= 0) {
    return { success: false, error: 'Trip date and positive miles are required.' }
  }

  const { error } = await supabase.from('mileage_logs' as any).insert({
    tenant_id: user.tenantId!,
    event_id: data.eventId || null,
    trip_date: data.tripDate,
    purpose: data.purpose,
    from_location: data.fromLocation || null,
    to_location: data.toLocation || null,
    miles: data.miles,
    description: [
      MILEAGE_PURPOSE_LABELS[data.purpose],
      data.fromLocation && data.toLocation ? `${data.fromLocation} to ${data.toLocation}` : null,
    ]
      .filter(Boolean)
      .join(' - '),
    notes: data.notes || null,
  })

  if (error) {
    console.error('[addMileageLog]', error)
    return { success: false, error: 'Failed to add mileage entry.' }
  }

  revalidatePath('/finance/mileage')
  if (data.eventId) revalidatePath(`/events/${data.eventId}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Get mileage logs with optional date range filter
// ---------------------------------------------------------------------------
export async function getMileageLogs(dateRange?: {
  from: string
  to: string
}): Promise<MileageEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('mileage_logs' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('trip_date', { ascending: false })

  if (dateRange) {
    query = query.gte('trip_date', dateRange.from).lte('trip_date', dateRange.to)
  }

  const { data } = await query
  return ((data ?? []) as any[]).map(mapRow)
}

// ---------------------------------------------------------------------------
// Update a mileage log entry
// ---------------------------------------------------------------------------
export async function updateMileageLog(
  id: string,
  data: {
    eventId?: string | null
    tripDate?: string
    purpose?: MileagePurpose
    fromLocation?: string
    toLocation?: string
    miles?: number
    notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (data.eventId !== undefined) updates.event_id = data.eventId || null
  if (data.tripDate) updates.trip_date = data.tripDate
  if (data.purpose) updates.purpose = data.purpose
  if (data.fromLocation !== undefined) updates.from_location = data.fromLocation || null
  if (data.toLocation !== undefined) updates.to_location = data.toLocation || null
  if (data.miles !== undefined) updates.miles = data.miles
  if (data.notes !== undefined) updates.notes = data.notes || null

  // Rebuild description if purpose or locations changed
  if (data.purpose || data.fromLocation !== undefined || data.toLocation !== undefined) {
    const purpose = data.purpose ? MILEAGE_PURPOSE_LABELS[data.purpose] : null
    const route =
      data.fromLocation && data.toLocation ? `${data.fromLocation} to ${data.toLocation}` : null
    updates.description = [purpose, route].filter(Boolean).join(' - ') || null
  }

  const { error } = await supabase
    .from('mileage_logs' as any)
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateMileageLog]', error)
    return { success: false, error: 'Failed to update mileage entry.' }
  }

  revalidatePath('/finance/mileage')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Delete a mileage log entry
// ---------------------------------------------------------------------------
export async function deleteMileageLog(id: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('mileage_logs' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteMileageLog]', error)
    return { success: false }
  }

  revalidatePath('/finance/mileage')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Get YTD summary with purpose and month breakdowns
// ---------------------------------------------------------------------------
export async function getMileageSummary(year: number): Promise<MileageSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('mileage_logs' as any)
    .select('miles, purpose, trip_date')
    .eq('tenant_id', user.tenantId!)
    .gte('trip_date', `${year}-01-01`)
    .lt('trip_date', `${year + 1}-01-01`)

  const rows = (data ?? []) as any[]

  // By purpose
  const purposeMap = new Map<MileagePurpose, { totalMiles: number; tripCount: number }>()
  // By month
  const monthMap = new Map<number, { totalMiles: number; tripCount: number }>()

  let totalMiles = 0

  for (const r of rows) {
    const miles = Number(r.miles)
    const purpose = (r.purpose || 'other') as MileagePurpose
    const month = new Date(r.trip_date).getMonth() + 1

    totalMiles += miles

    const p = purposeMap.get(purpose) || { totalMiles: 0, tripCount: 0 }
    p.totalMiles += miles
    p.tripCount += 1
    purposeMap.set(purpose, p)

    const m = monthMap.get(month) || { totalMiles: 0, tripCount: 0 }
    m.totalMiles += miles
    m.tripCount += 1
    monthMap.set(month, m)
  }

  const byPurpose: MileagePurposeBreakdown[] = Array.from(purposeMap.entries())
    .map(([purpose, d]) => ({
      purpose,
      label: MILEAGE_PURPOSE_LABELS[purpose] || purpose,
      totalMiles: Math.round(d.totalMiles * 10) / 10,
      tripCount: d.tripCount,
      deductionCents: computeDeduction(d.totalMiles),
    }))
    .sort((a, b) => b.totalMiles - a.totalMiles)

  const byMonth: MileageMonthBreakdown[] = Array.from(monthMap.entries())
    .map(([month, d]) => ({
      month,
      totalMiles: Math.round(d.totalMiles * 10) / 10,
      tripCount: d.tripCount,
      deductionCents: computeDeduction(d.totalMiles),
    }))
    .sort((a, b) => a.month - b.month)

  return {
    year,
    totalMiles: Math.round(totalMiles * 10) / 10,
    totalDeductionCents: computeDeduction(totalMiles),
    totalTrips: rows.length,
    byPurpose,
    byMonth,
    ratePerMile: IRS_RATE_PER_MILE,
  }
}

// ---------------------------------------------------------------------------
// Get all mileage entries for a specific event
// ---------------------------------------------------------------------------
export async function getMileageForEvent(eventId: string): Promise<MileageEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('mileage_logs' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .order('trip_date', { ascending: false })

  return ((data ?? []) as any[]).map(mapRow)
}
