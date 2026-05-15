'use server'

import { auth } from '@/lib/auth'
import { createAdminClient } from '@/lib/db/admin'
import { recordSavedChefPreferenceSignal } from '@/lib/discovery/culinary-profile-persistence'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type SentinelChefRailItem = {
  chefId: string
  slug: string
  displayName: string
  primaryCuisine: string | null
  city: string | null
  state: string | null
}

/**
 * Toggle save status for a chef.
 * Returns { saved: true } if the chef is now saved, { saved: false } if unsaved.
 * Returns { saved: false } gracefully if not authenticated.
 */
export async function toggleSaveChef(chefId: string): Promise<{ saved: boolean }> {
  const validated = z.string().uuid().safeParse(chefId)
  if (!validated.success) return { saved: false }

  const session = await auth()
  if (!session?.user?.id) return { saved: false }

  const authUserId = session.user.id
  const db: any = createAdminClient()

  const { data: existing } = await db
    .from('consumer_saved_chefs')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('chef_id', chefId)
    .single()

  if (existing?.id) {
    await db
      .from('consumer_saved_chefs')
      .delete()
      .eq('auth_user_id', authUserId)
      .eq('chef_id', chefId)
    await persistSavedChefSignal({ authUserId, chefId, saved: false })
    revalidatePath('/')
    return { saved: false }
  }

  await db.from('consumer_saved_chefs').insert({ auth_user_id: authUserId, chef_id: chefId })
  await persistSavedChefSignal({ authUserId, chefId, saved: true })
  revalidatePath('/')
  return { saved: true }
}

/**
 * Get all saved chef IDs for the current authenticated user.
 * Returns an empty array if not authenticated.
 */
export async function getSavedChefIds(): Promise<string[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const db: any = createAdminClient()
  const { data, error } = await db
    .from('consumer_saved_chefs')
    .select('chef_id')
    .eq('auth_user_id', session.user.id)

  if (error || !data) return []
  return (data as { chef_id: string }[]).map((r) => r.chef_id)
}

/**
 * Get saved chef profile data for the homepage discovery rail (max 3).
 * Returns an empty array if not authenticated or no saved chefs.
 */
export async function getSavedChefsForRail(): Promise<SentinelChefRailItem[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const db: any = createAdminClient()

  const { data: saved, error: savedErr } = await db
    .from('consumer_saved_chefs')
    .select('chef_id')
    .eq('auth_user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  if (savedErr || !saved?.length) return []

  const chefIds = (saved as { chef_id: string }[]).map((r) => r.chef_id)

  const [chefsResult, profilesResult] = await Promise.all([
    db.from('chefs').select('id, slug, display_name').in('id', chefIds).not('slug', 'is', null),
    db
      .from('chef_marketplace_profiles')
      .select('chef_id, cuisine_types, service_area_city, service_area_state')
      .in('chef_id', chefIds),
  ])

  if (chefsResult.error || !chefsResult.data) return []

  const profileMap = new Map<
    string,
    {
      cuisine_types: string[] | null
      service_area_city: string | null
      service_area_state: string | null
    }
  >()
  for (const p of (profilesResult.data ?? []) as {
    chef_id: string
    cuisine_types: string[] | null
    service_area_city: string | null
    service_area_state: string | null
  }[]) {
    profileMap.set(p.chef_id, p)
  }

  const results: SentinelChefRailItem[] = []
  for (const chef of chefsResult.data as { id: string; slug: string; display_name: string }[]) {
    if (!chef.slug) continue
    const profile = profileMap.get(chef.id)
    results.push({
      chefId: chef.id,
      slug: chef.slug,
      displayName: chef.display_name,
      primaryCuisine: profile?.cuisine_types?.[0] ?? null,
      city: profile?.service_area_city ?? null,
      state: profile?.service_area_state ?? null,
    })
  }

  // Restore the original save order
  const order = new Map(chefIds.map((id, i) => [id, i]))
  results.sort((a, b) => (order.get(a.chefId) ?? 99) - (order.get(b.chefId) ?? 99))

  return results
}

async function persistSavedChefSignal(input: {
  authUserId: string
  chefId: string
  saved: boolean
}): Promise<void> {
  try {
    await recordSavedChefPreferenceSignal({
      ownerId: input.authUserId,
      chefId: input.chefId,
      saved: input.saved,
    })
  } catch {
    // Saved chefs remain the source of truth; profile learning is best-effort.
  }
}
