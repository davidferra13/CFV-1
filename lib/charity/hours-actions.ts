'use server'

/**
 * Charity Hours CRUD — server actions for logging volunteer hours.
 * Pattern follows lib/staff/clock-actions.ts.
 */

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { CharityHourEntry, CharityOrganization, CharityHoursSummary } from './hours-types'

// ─── Schemas ──────────────────────────────────────────────────

const LogHoursSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required').max(500),
  organizationAddress: z.string().max(500).optional(),
  googlePlaceId: z.string().max(200).optional(),
  ein: z.string().max(20).optional(),
  isVerified501c: z.boolean().default(false),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  hours: z.number().gt(0, 'Hours must be greater than 0').lte(24, 'Max 24 hours per entry'),
  notes: z.string().max(2000).optional(),
})

const UpdateHoursSchema = LogHoursSchema.extend({
  id: z.string().uuid(),
})

// ─── Helpers ──────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): CharityHourEntry {
  return {
    id: row.id as string,
    organizationName: row.organization_name as string,
    organizationAddress: (row.organization_address as string) ?? null,
    googlePlaceId: (row.google_place_id as string) ?? null,
    ein: (row.ein as string) ?? null,
    isVerified501c: (row.is_verified_501c as boolean) ?? false,
    serviceDate: row.service_date as string,
    hours: Number(row.hours),
    notes: (row.notes as string) ?? null,
    createdAt: row.created_at as string,
  }
}

// ─── Actions ──────────────────────────────────────────────────

/** Log new charity hours */
export async function logCharityHours(
  input: z.input<typeof LogHoursSchema>
): Promise<CharityHourEntry> {
  const user = await requireChef()
  const parsed = LogHoursSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('charity_hours' as any)
    .insert({
      chef_id: user.tenantId!,
      organization_name: parsed.organizationName,
      organization_address: parsed.organizationAddress || null,
      google_place_id: parsed.googlePlaceId || null,
      ein: parsed.ein || null,
      is_verified_501c: parsed.isVerified501c,
      service_date: parsed.serviceDate,
      hours: parsed.hours,
      notes: parsed.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to log charity hours: ${error.message}`)

  revalidatePath('/charity/hours')
  revalidatePath('/charity')

  return mapRow(data as any)
}

/** Update an existing charity hour entry */
export async function updateCharityHours(
  input: z.input<typeof UpdateHoursSchema>
): Promise<CharityHourEntry> {
  const user = await requireChef()
  const parsed = UpdateHoursSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('charity_hours' as any)
    .update({
      organization_name: parsed.organizationName,
      organization_address: parsed.organizationAddress || null,
      google_place_id: parsed.googlePlaceId || null,
      ein: parsed.ein || null,
      is_verified_501c: parsed.isVerified501c,
      service_date: parsed.serviceDate,
      hours: parsed.hours,
      notes: parsed.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update charity hours: ${error.message}`)

  revalidatePath('/charity/hours')
  revalidatePath('/charity')

  return mapRow(data as any)
}

/** Delete a charity hour entry */
export async function deleteCharityHours(id: string): Promise<void> {
  const user = await requireChef()
  z.string().uuid().parse(id)
  const supabase = createServerClient()

  const { error } = await supabase
    .from('charity_hours' as any)
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete charity hours: ${error.message}`)

  revalidatePath('/charity/hours')
  revalidatePath('/charity')
}

/** Get charity hour entries, most recent first */
export async function getCharityHours(filters?: {
  startDate?: string
  endDate?: string
  organizationName?: string
}): Promise<CharityHourEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('charity_hours' as any)
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('service_date', { ascending: false })
    .limit(500)

  if (filters?.startDate) query = query.gte('service_date', filters.startDate)
  if (filters?.endDate) query = query.lte('service_date', filters.endDate)
  if (filters?.organizationName) query = query.eq('organization_name', filters.organizationName)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch charity hours: ${error.message}`)

  return ((data as any[]) ?? []).map(mapRow)
}

/** Get recent organizations the chef has logged hours at (for autocomplete) */
export async function getRecentCharityOrgs(): Promise<CharityOrganization[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('charity_hours' as any)
    .select(
      'organization_name, organization_address, google_place_id, ein, is_verified_501c, service_date, hours'
    )
    .eq('chef_id', user.tenantId!)
    .order('service_date', { ascending: false })

  if (error) throw new Error(`Failed to fetch recent orgs: ${error.message}`)

  // Aggregate client-side — small dataset per chef
  const orgMap = new Map<string, CharityOrganization>()
  for (const row of (data as any[]) ?? []) {
    const key = row.organization_name as string
    const existing = orgMap.get(key)
    if (existing) {
      existing.totalHours += Number(row.hours)
      if (row.service_date > existing.lastUsed) existing.lastUsed = row.service_date
    } else {
      orgMap.set(key, {
        organizationName: row.organization_name,
        organizationAddress: row.organization_address ?? null,
        googlePlaceId: row.google_place_id ?? null,
        ein: row.ein ?? null,
        isVerified501c: row.is_verified_501c ?? false,
        lastUsed: row.service_date,
        totalHours: Number(row.hours),
      })
    }
  }

  return Array.from(orgMap.values())
    .sort((a, b) => b.lastUsed.localeCompare(a.lastUsed))
    .slice(0, 20)
}

/** Compute summary stats from all logged hours */
export async function getCharityHoursSummary(): Promise<CharityHoursSummary> {
  const entries = await getCharityHours()

  const orgMap = new Map<string, { hours: number; isVerified: boolean }>()
  let totalHours = 0

  for (const entry of entries) {
    totalHours += entry.hours
    const existing = orgMap.get(entry.organizationName)
    if (existing) {
      existing.hours += entry.hours
    } else {
      orgMap.set(entry.organizationName, {
        hours: entry.hours,
        isVerified: entry.isVerified501c,
      })
    }
  }

  const hoursByOrg = Array.from(orgMap.entries())
    .map(([name, data]) => ({ name, hours: data.hours, isVerified: data.isVerified }))
    .sort((a, b) => b.hours - a.hours)

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalEntries: entries.length,
    uniqueOrgs: orgMap.size,
    verified501cOrgs: hoursByOrg.filter((o) => o.isVerified).length,
    hoursByOrg,
  }
}
