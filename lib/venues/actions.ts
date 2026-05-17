'use server'

// Legacy venue actions - preserved for backward compatibility.
// New code should import from '@/lib/venues/recon-actions' and '@/lib/venues/recon-types'.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type { VenueProfile } from './recon-types'

/** @deprecated Use getVenueProfile(id) from recon-actions. This one looks up by name. */
export async function getVenueProfileByName(venueName: string) {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('venue_profiles')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .eq('venue_name', venueName)
    .maybeSingle()

  if (error) throw error
  return data
}

/** @deprecated Use getVenues() from recon-actions. */
export async function getVenueProfiles() {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('venue_profiles')
    .select('*')
    .eq('tenant_id', chef.tenantId!)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** @deprecated Use createVenueProfile() or updateVenueProfile() from recon-actions. */
export async function upsertVenueProfile(input: {
  venue_name: string
  has_full_kitchen?: boolean | null
  oven_count?: number | null
  burner_count?: number | null
  has_refrigeration?: boolean | null
  has_freezer?: boolean | null
  has_running_water?: boolean | null
  notes?: string | null
  last_visited_at?: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    const chef = await requireChef()
    const tenantId = chef.tenantId!
    const db: any = createServerClient()

    const { error } = await db.from('venue_profiles').upsert(
      {
        tenant_id: tenantId,
        venue_name: input.venue_name,
        has_full_kitchen: input.has_full_kitchen ?? null,
        oven_count: input.oven_count ?? null,
        burner_count: input.burner_count ?? null,
        has_refrigeration: input.has_refrigeration ?? null,
        has_freezer: input.has_freezer ?? null,
        has_running_water: input.has_running_water ?? null,
        notes: input.notes ?? null,
        last_visited_at: input.last_visited_at ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id, venue_name' }
    )

    if (error) return { success: false, error: error.message }

    revalidatePath('/events')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to save venue profile' }
  }
}
