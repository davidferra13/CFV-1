// Beverage library & menu pairing server actions
// Chef-only: manage beverages, pairings, and beverage costing

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ─── Types ──────────────────────────────────────────────────────────────────────

export type BeverageType = 'wine' | 'cocktail' | 'mocktail' | 'beer' | 'spirit' | 'non-alcoholic'

export type Beverage = {
  id: string
  chef_id: string
  name: string
  type: BeverageType
  subtype: string | null
  description: string | null
  cost_cents: number | null
  markup_percent: number | null
  sell_price_cents: number | null
  serving_size: string | null
  servings_per_unit: number | null
  pairing_notes: string | null
  recipe: string | null
  tags: string[]
  region: string | null
  vintage: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type MenuBeveragePairing = {
  id: string
  chef_id: string
  menu_id: string | null
  dish_name: string
  beverage_id: string
  course_number: number | null
  pairing_note: string | null
  created_at: string
  beverage?: Beverage
}

// ─── Schemas ────────────────────────────────────────────────────────────────────

const BeverageTypeEnum = z.enum(['wine', 'cocktail', 'mocktail', 'beer', 'spirit', 'non-alcoholic'])

const CreateBeverageSchema = z.object({
  name: z.string().min(1, 'Name required'),
  type: BeverageTypeEnum,
  subtype: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  cost_cents: z.number().int().nullable().optional(),
  markup_percent: z.number().int().nullable().optional(),
  sell_price_cents: z.number().int().nullable().optional(),
  serving_size: z.string().nullable().optional(),
  servings_per_unit: z.number().int().positive().nullable().optional(),
  pairing_notes: z.string().nullable().optional(),
  recipe: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  region: z.string().nullable().optional(),
  vintage: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
})

const UpdateBeverageSchema = CreateBeverageSchema.partial().omit({ type: true }).extend({
  type: BeverageTypeEnum.optional(),
})

export type CreateBeverageInput = z.infer<typeof CreateBeverageSchema>
export type UpdateBeverageInput = z.infer<typeof UpdateBeverageSchema>

// ─── Beverage CRUD ──────────────────────────────────────────────────────────────

export async function createBeverage(data: CreateBeverageInput) {
  const user = await requireChef()
  const parsed = CreateBeverageSchema.parse(data)
  const supabase = createServerClient()

  const { data: beverage, error } = await supabase
    .from('beverages')
    .insert({ ...parsed, chef_id: user.entityId })
    .select()
    .single()

  if (error) throw new Error(`Failed to create beverage: ${error.message}`)

  revalidatePath('/culinary/beverages')
  return beverage
}

export async function updateBeverage(id: string, data: UpdateBeverageInput) {
  const user = await requireChef()
  const parsed = UpdateBeverageSchema.parse(data)
  const supabase = createServerClient()

  const { data: beverage, error } = await supabase
    .from('beverages')
    .update(parsed)
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update beverage: ${error.message}`)

  revalidatePath('/culinary/beverages')
  return beverage
}

export async function deleteBeverage(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('beverages')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) throw new Error(`Failed to delete beverage: ${error.message}`)

  revalidatePath('/culinary/beverages')
  return { success: true }
}

export async function getBeverages(
  filters?: { type?: BeverageType; search?: string; activeOnly?: boolean }
): Promise<Beverage[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('beverages')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('name')

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.activeOnly !== false) {
    query = query.eq('is_active', true)
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to load beverages: ${error.message}`)
  return (data ?? []) as Beverage[]
}

export async function getBeverage(id: string): Promise<Beverage | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('beverages')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (error) return null
  return data as Beverage
}

// ─── Menu Beverage Pairings ─────────────────────────────────────────────────────

const AddPairingSchema = z.object({
  menuId: z.string().uuid(),
  dishName: z.string().min(1, 'Dish name required'),
  beverageId: z.string().uuid(),
  courseNumber: z.number().int().positive().nullable().optional(),
  note: z.string().nullable().optional(),
})

export async function addPairingToMenu(
  menuId: string,
  dishName: string,
  beverageId: string,
  note?: string | null,
  courseNumber?: number | null
) {
  const user = await requireChef()
  const supabase = createServerClient()

  AddPairingSchema.parse({ menuId, dishName, beverageId, note, courseNumber })

  const { data: pairing, error } = await supabase
    .from('menu_beverage_pairings')
    .insert({
      chef_id: user.entityId,
      menu_id: menuId,
      dish_name: dishName,
      beverage_id: beverageId,
      course_number: courseNumber ?? null,
      pairing_note: note ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add pairing: ${error.message}`)

  revalidatePath(`/culinary/menus/${menuId}`)
  return pairing
}

export async function removePairing(pairingId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get the pairing first to know which menu to revalidate
  const { data: pairing } = await supabase
    .from('menu_beverage_pairings')
    .select('menu_id')
    .eq('id', pairingId)
    .eq('chef_id', user.entityId)
    .single()

  const { error } = await supabase
    .from('menu_beverage_pairings')
    .delete()
    .eq('id', pairingId)
    .eq('chef_id', user.entityId)

  if (error) throw new Error(`Failed to remove pairing: ${error.message}`)

  if (pairing?.menu_id) {
    revalidatePath(`/culinary/menus/${pairing.menu_id}`)
  }
  return { success: true }
}

export async function getMenuPairings(menuId: string): Promise<MenuBeveragePairing[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('menu_beverage_pairings')
    .select('*, beverage:beverages(*)')
    .eq('menu_id', menuId)
    .eq('chef_id', user.entityId)
    .order('course_number', { ascending: true, nullsFirst: false })

  if (error) throw new Error(`Failed to load pairings: ${error.message}`)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    chef_id: row.chef_id as string,
    menu_id: row.menu_id as string | null,
    dish_name: row.dish_name as string,
    beverage_id: row.beverage_id as string,
    course_number: row.course_number as number | null,
    pairing_note: row.pairing_note as string | null,
    created_at: row.created_at as string,
    beverage: row.beverage as Beverage | undefined,
  }))
}

export async function calculateBeverageCostForEvent(eventId: string): Promise<{
  totalCostCents: number
  totalSellCents: number
  pairingCount: number
  items: Array<{
    beverageName: string
    costCents: number
    sellCents: number
  }>
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get the menu for this event
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)

  if (!menus || menus.length === 0) {
    return { totalCostCents: 0, totalSellCents: 0, pairingCount: 0, items: [] }
  }

  const menuIds = menus.map((m) => m.id)

  // Get pairings for all menus on this event
  const { data: pairings } = await supabase
    .from('menu_beverage_pairings')
    .select('*, beverage:beverages(*)')
    .in('menu_id', menuIds)
    .eq('chef_id', user.entityId)

  if (!pairings || pairings.length === 0) {
    return { totalCostCents: 0, totalSellCents: 0, pairingCount: 0, items: [] }
  }

  let totalCostCents = 0
  let totalSellCents = 0
  const items: Array<{ beverageName: string; costCents: number; sellCents: number }> = []

  for (const p of pairings) {
    const bev = p.beverage as Beverage | null
    if (!bev) continue
    const cost = bev.cost_cents ?? 0
    const sell = bev.sell_price_cents ?? (cost * (bev.markup_percent ?? 200)) / 100
    totalCostCents += cost
    totalSellCents += Math.round(sell)
    items.push({
      beverageName: bev.name,
      costCents: cost,
      sellCents: Math.round(sell),
    })
  }

  return {
    totalCostCents,
    totalSellCents,
    pairingCount: pairings.length,
    items,
  }
}
