'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_GEAR_ITEMS } from './defaults'
import type { GearCategory } from './defaults'

// ─── Types ───────────────────────────────────────────────────────────────────

export type GearDefault = {
  id: string
  chef_id: string
  item_name: string
  category: GearCategory
  sort_order: number
  is_active: boolean
  notes: string | null
  created_at: string
}

export type EventGearStatus = {
  gearChecked: boolean
  gearCheckedAt: string | null
  confirmedCount: number
}

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seedGearDefaults(chefId: string): Promise<void> {
  const db: any = createServerClient()

  const rows = DEFAULT_GEAR_ITEMS.map((item, i) => ({
    chef_id: chefId,
    item_name: item.item_name,
    category: item.category,
    sort_order: i,
  }))

  await db.from('chef_gear_defaults').insert(rows)
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getGearDefaults(chefId: string): Promise<GearDefault[]> {
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_gear_defaults')
    .select('*')
    .eq('chef_id', chefId)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[gear/actions] getGearDefaults error:', error)
    return []
  }

  // Auto-seed on first access
  if (!data || data.length === 0) {
    await seedGearDefaults(chefId)
    const { data: seeded } = await db
      .from('chef_gear_defaults')
      .select('*')
      .eq('chef_id', chefId)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
    return (seeded ?? []) as GearDefault[]
  }

  return data as GearDefault[]
}

// ─── Mutate ──────────────────────────────────────────────────────────────────

export async function addGearDefault(
  chefId: string,
  item: { item_name: string; category: string; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  if (user.entityId !== chefId) {
    return { success: false, error: 'Unauthorized' }
  }

  const db: any = createServerClient()

  // Get max sort_order in category
  const { data: existing } = await db
    .from('chef_gear_defaults')
    .select('sort_order')
    .eq('chef_id', chefId)
    .eq('category', item.category)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSort = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { error } = await db.from('chef_gear_defaults').insert({
    chef_id: chefId,
    item_name: item.item_name,
    category: item.category,
    sort_order: nextSort,
    notes: item.notes ?? null,
  })

  if (error) {
    console.error('[gear/actions] addGearDefault error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function removeGearDefault(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_gear_defaults')
    .update({ is_active: false })
    .eq('id', id)
    .eq('chef_id', user.entityId!)

  if (error) {
    console.error('[gear/actions] removeGearDefault error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function reactivateGearDefault(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_gear_defaults')
    .update({ is_active: true })
    .eq('id', id)
    .eq('chef_id', user.entityId!)

  if (error) {
    console.error('[gear/actions] reactivateGearDefault error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ─── Event Gear Status ───────────────────────────────────────────────────────

export async function getEventGearStatus(eventId: string): Promise<EventGearStatus> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('gear_checked, gear_checked_at')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const { count } = await db
    .from('packing_confirmations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .like('item_key', 'gear:%')

  return {
    gearChecked: event?.gear_checked ?? false,
    gearCheckedAt: event?.gear_checked_at ?? null,
    confirmedCount: count ?? 0,
  }
}

export async function markGearChecked(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('events')
    .update({
      gear_checked: true,
      gear_checked_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[gear/actions] markGearChecked error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function resetGearCheck(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Reset event flag
  const { error: eventError } = await db
    .from('events')
    .update({
      gear_checked: false,
      gear_checked_at: null,
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (eventError) {
    console.error('[gear/actions] resetGearCheck event error:', eventError)
    return { success: false, error: eventError.message }
  }

  // Delete gear confirmations
  await db
    .from('packing_confirmations')
    .delete()
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .like('item_key', 'gear:%')

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
