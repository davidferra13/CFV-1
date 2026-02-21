// Enhanced Mileage Tracking Server Actions
// Provides round-trip logging and purpose-based mileage reporting.
// Uses existing table: mileage_logs

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type MileageEntry = {
  id: string
  chefId: string
  eventId: string | null
  fromAddress: string
  toAddress: string
  distanceMiles: number
  purpose: string
  loggedAt: string
}

export type MileageByPurpose = {
  purpose: string
  totalMiles: number
  tripCount: number
  estimatedDeductionCents: number
}

export type MileageSummary = {
  taxYear: number
  purposes: MileageByPurpose[]
  grandTotalMiles: number
  grandTotalDeductionCents: number
  ratePerMileCents: number
}

// --- Schemas ---

const LogRoundTripSchema = z.object({
  eventId: z.string().uuid().nullable().optional(),
  fromAddress: z.string().min(1, 'From address is required'),
  toAddress: z.string().min(1, 'To address is required'),
  distanceMiles: z.number().positive('Distance must be positive'),
  purpose: z.string().min(1, 'Purpose is required'),
})

export type LogRoundTripInput = z.infer<typeof LogRoundTripSchema>

const TaxYearSchema = z.number().int().min(2020).max(2030)

// IRS standard mileage rate for 2026 (67 cents/mile)
const MILEAGE_RATE_CENTS_2026 = 67

// --- Actions ---

/**
 * Log a round trip (to and return legs as two separate entries).
 * Inserts two mileage_logs entries with mirrored from/to addresses.
 */
export async function logRoundTrip(
  input: LogRoundTripInput
): Promise<{ success: boolean; entries: MileageEntry[] }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const validated = LogRoundTripSchema.parse(input)

  const basePayload = {
    chef_id: user.tenantId!,
    event_id: validated.eventId ?? null,
    purpose: validated.purpose,
    distance_miles: validated.distanceMiles,
  }

  // Leg 1: outbound (from -> to)
  const outboundPayload = {
    ...basePayload,
    from_address: validated.fromAddress,
    to_address: validated.toAddress,
    leg: 'outbound',
  }

  // Leg 2: return (to -> from)
  const returnPayload = {
    ...basePayload,
    from_address: validated.toAddress,
    to_address: validated.fromAddress,
    leg: 'return',
  }

  const { data: entries, error } = await (supabase as any)
    .from('mileage_logs')
    .insert([outboundPayload, returnPayload])
    .select()

  if (error) {
    console.error('[logRoundTrip] Error:', error)
    throw new Error('Failed to log round trip mileage')
  }

  revalidatePath('/finance')
  if (validated.eventId) {
    revalidatePath(`/events/${validated.eventId}`)
  }

  return {
    success: true,
    entries: (entries || []).map((row: any) => ({
      id: row.id,
      chefId: row.chef_id,
      eventId: row.event_id,
      fromAddress: row.from_address,
      toAddress: row.to_address,
      distanceMiles: parseFloat(row.distance_miles),
      purpose: row.purpose,
      loggedAt: row.created_at,
    })),
  }
}

/**
 * Get mileage totals grouped by purpose for a given tax year.
 * Includes estimated deduction based on IRS standard mileage rate.
 */
export async function getMileageByPurpose(taxYear: number): Promise<MileageSummary> {
  const user = await requireChef()
  const supabase = createServerClient()

  const validatedYear = TaxYearSchema.parse(taxYear)

  const yearStart = `${validatedYear}-01-01`
  const yearEnd = `${validatedYear}-12-31`

  const { data: logs, error } = await (supabase as any)
    .from('mileage_logs')
    .select('purpose, distance_miles')
    .eq('chef_id', user.tenantId!)
    .gte('created_at', `${yearStart}T00:00:00`)
    .lte('created_at', `${yearEnd}T23:59:59`)

  if (error) {
    console.error('[getMileageByPurpose] Error:', error)
    throw new Error('Failed to fetch mileage data')
  }

  // Group by purpose
  const purposeMap = new Map<string, { totalMiles: number; tripCount: number }>()

  for (const log of logs || []) {
    const purpose = log.purpose || 'Other'
    const miles = parseFloat(log.distance_miles) || 0

    const existing = purposeMap.get(purpose) || { totalMiles: 0, tripCount: 0 }
    existing.totalMiles += miles
    existing.tripCount += 1
    purposeMap.set(purpose, existing)
  }

  const ratePerMileCents = MILEAGE_RATE_CENTS_2026

  const purposes: MileageByPurpose[] = Array.from(purposeMap.entries())
    .map(([purpose, data]) => ({
      purpose,
      totalMiles: Math.round(data.totalMiles * 100) / 100,
      tripCount: data.tripCount,
      estimatedDeductionCents: Math.round(data.totalMiles * ratePerMileCents),
    }))
    .sort((a, b) => b.totalMiles - a.totalMiles)

  const grandTotalMiles = purposes.reduce((sum, p) => sum + p.totalMiles, 0)
  const grandTotalDeductionCents = purposes.reduce((sum, p) => sum + p.estimatedDeductionCents, 0)

  return {
    taxYear: validatedYear,
    purposes,
    grandTotalMiles: Math.round(grandTotalMiles * 100) / 100,
    grandTotalDeductionCents,
    ratePerMileCents,
  }
}
