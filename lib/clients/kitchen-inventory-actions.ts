'use server'

// Kitchen Inventory Actions
// CRUD for client kitchen inventory and chef equipment master.
// Includes packing list generation (gap analysis) and kitchen templates.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type KitchenCategory =
  | 'cookware'
  | 'appliance'
  | 'utensil'
  | 'storage'
  | 'servingware'
  | 'other'
export type KitchenCondition = 'good' | 'fair' | 'poor' | 'missing'

export interface KitchenItem {
  id: string
  tenant_id: string
  client_id: string
  category: KitchenCategory
  item_name: string
  quantity: number
  condition: KitchenCondition
  notes: string | null
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

export interface ChefEquipmentItem {
  id: string
  tenant_id: string
  category: KitchenCategory
  item_name: string
  quantity: number
  is_portable: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PackingListItem {
  item_name: string
  category: KitchenCategory
  reason: 'client_missing' | 'client_poor_condition' | 'client_insufficient_qty'
  chef_has: boolean
  chef_quantity: number
  needed_quantity: number
  notes: string | null
}

// ─── Client Kitchen Inventory CRUD ────────────────────────────────────────────

export async function getClientKitchenInventory(clientId: string): Promise<KitchenItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('client_kitchen_inventory' as any)
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('category')
    .order('item_name')

  if (error) throw new Error(`Failed to load kitchen inventory: ${error.message}`)
  return (data ?? []) as KitchenItem[]
}

export async function addKitchenItem(
  clientId: string,
  data: {
    category: KitchenCategory
    item_name: string
    quantity?: number
    condition?: KitchenCondition
    notes?: string
  }
): Promise<KitchenItem> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const trimmedName = data.item_name.trim()
  if (!trimmedName) throw new Error('Item name is required')

  const { data: item, error } = await supabase
    .from('client_kitchen_inventory' as any)
    .insert({
      tenant_id: user.tenantId!,
      client_id: clientId,
      category: data.category,
      item_name: trimmedName,
      quantity: data.quantity ?? 1,
      condition: data.condition ?? 'good',
      notes: data.notes?.trim() || null,
      last_verified_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add kitchen item: ${error.message}`)
  revalidatePath(`/clients/${clientId}`)
  return item as KitchenItem
}

export async function updateKitchenItem(
  itemId: string,
  data: {
    category?: KitchenCategory
    item_name?: string
    quantity?: number
    condition?: KitchenCondition
    notes?: string
    last_verified_at?: string
  }
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.category !== undefined) updates.category = data.category
  if (data.item_name !== undefined) updates.item_name = data.item_name.trim()
  if (data.quantity !== undefined) updates.quantity = data.quantity
  if (data.condition !== undefined) updates.condition = data.condition
  if (data.notes !== undefined) updates.notes = data.notes?.trim() || null
  if (data.last_verified_at !== undefined) updates.last_verified_at = data.last_verified_at

  const { error } = await supabase
    .from('client_kitchen_inventory' as any)
    .update(updates)
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to update kitchen item: ${error.message}`)

  // Get client_id for revalidation
  const { data: item } = await supabase
    .from('client_kitchen_inventory' as any)
    .select('client_id')
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (item) revalidatePath(`/clients/${(item as any).client_id}`)
}

export async function deleteKitchenItem(itemId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get client_id before deleting for revalidation
  const { data: item } = await supabase
    .from('client_kitchen_inventory' as any)
    .select('client_id')
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const { error } = await supabase
    .from('client_kitchen_inventory' as any)
    .delete()
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete kitchen item: ${error.message}`)
  if (item) revalidatePath(`/clients/${(item as any).client_id}`)
}

// ─── Chef Equipment Master CRUD ──────────────────────────────────────────────

export async function getChefEquipment(): Promise<ChefEquipmentItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('chef_equipment_master' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('category')
    .order('item_name')

  if (error) throw new Error(`Failed to load chef equipment: ${error.message}`)
  return (data ?? []) as ChefEquipmentItem[]
}

export async function addChefEquipment(data: {
  category: KitchenCategory
  item_name: string
  quantity?: number
  is_portable?: boolean
  notes?: string
}): Promise<ChefEquipmentItem> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const trimmedName = data.item_name.trim()
  if (!trimmedName) throw new Error('Item name is required')

  const { data: item, error } = await supabase
    .from('chef_equipment_master' as any)
    .insert({
      tenant_id: user.tenantId!,
      category: data.category,
      item_name: trimmedName,
      quantity: data.quantity ?? 1,
      is_portable: data.is_portable ?? true,
      notes: data.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add chef equipment: ${error.message}`)
  revalidatePath('/settings/equipment')
  return item as ChefEquipmentItem
}

export async function updateChefEquipment(
  itemId: string,
  data: {
    category?: KitchenCategory
    item_name?: string
    quantity?: number
    is_portable?: boolean
    notes?: string
  }
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.category !== undefined) updates.category = data.category
  if (data.item_name !== undefined) updates.item_name = data.item_name.trim()
  if (data.quantity !== undefined) updates.quantity = data.quantity
  if (data.is_portable !== undefined) updates.is_portable = data.is_portable
  if (data.notes !== undefined) updates.notes = data.notes?.trim() || null

  const { error } = await supabase
    .from('chef_equipment_master' as any)
    .update(updates)
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to update chef equipment: ${error.message}`)
  revalidatePath('/settings/equipment')
}

export async function deleteChefEquipment(itemId: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('chef_equipment_master' as any)
    .delete()
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete chef equipment: ${error.message}`)
  revalidatePath('/settings/equipment')
}

// ─── Packing List Generation ─────────────────────────────────────────────────

export async function generatePackingList(clientId: string): Promise<PackingListItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch client kitchen inventory
  const { data: clientItems } = await supabase
    .from('client_kitchen_inventory' as any)
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)

  // Fetch chef's portable equipment
  const { data: chefItems } = await supabase
    .from('chef_equipment_master' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_portable', true)

  const kitchen = (clientItems ?? []) as KitchenItem[]
  const equipment = (chefItems ?? []) as ChefEquipmentItem[]

  // Build a map of what the client has (usable items only)
  const clientHas = new Map<string, KitchenItem>()
  for (const item of kitchen) {
    const key = `${item.category}::${item.item_name.toLowerCase()}`
    clientHas.set(key, item)
  }

  // Build a map of what the chef can bring
  const chefHas = new Map<string, ChefEquipmentItem>()
  for (const item of equipment) {
    const key = `${item.category}::${item.item_name.toLowerCase()}`
    chefHas.set(key, item)
  }

  const packingList: PackingListItem[] = []

  // Check each chef equipment item: does the client need it?
  for (const equip of equipment) {
    const key = `${equip.category}::${equip.item_name.toLowerCase()}`
    const clientItem = clientHas.get(key)

    if (!clientItem) {
      // Client doesn't have this at all
      packingList.push({
        item_name: equip.item_name,
        category: equip.category,
        reason: 'client_missing',
        chef_has: true,
        chef_quantity: equip.quantity,
        needed_quantity: equip.quantity,
        notes: null,
      })
    } else if (clientItem.condition === 'poor' || clientItem.condition === 'missing') {
      // Client has it but it's in poor condition or marked missing
      packingList.push({
        item_name: equip.item_name,
        category: equip.category,
        reason: clientItem.condition === 'missing' ? 'client_missing' : 'client_poor_condition',
        chef_has: true,
        chef_quantity: equip.quantity,
        needed_quantity: equip.quantity,
        notes: clientItem.notes,
      })
    }
  }

  // Also flag client items marked as missing/poor that the chef does NOT own
  for (const item of kitchen) {
    if (item.condition !== 'missing' && item.condition !== 'poor') continue
    const key = `${item.category}::${item.item_name.toLowerCase()}`
    if (chefHas.has(key)) continue // Already covered above

    packingList.push({
      item_name: item.item_name,
      category: item.category,
      reason: item.condition === 'missing' ? 'client_missing' : 'client_poor_condition',
      chef_has: false,
      chef_quantity: 0,
      needed_quantity: 1,
      notes: item.notes
        ? `${item.notes} (Chef does not own this item)`
        : 'Chef does not own this item',
    })
  }

  // Sort by category then item name
  packingList.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category)
    return a.item_name.localeCompare(b.item_name)
  })

  return packingList
}

// ─── Kitchen Templates ───────────────────────────────────────────────────────

const KITCHEN_TEMPLATES: Record<
  string,
  Array<{ category: KitchenCategory; item_name: string; quantity: number }>
> = {
  basic: [
    { category: 'cookware', item_name: 'Frying Pan (10")', quantity: 1 },
    { category: 'cookware', item_name: 'Saucepan (2qt)', quantity: 1 },
    { category: 'cookware', item_name: 'Stock Pot (6qt)', quantity: 1 },
    { category: 'cookware', item_name: 'Baking Sheet', quantity: 1 },
    { category: 'appliance', item_name: 'Oven', quantity: 1 },
    { category: 'appliance', item_name: 'Stovetop (4 burners)', quantity: 1 },
    { category: 'appliance', item_name: 'Microwave', quantity: 1 },
    { category: 'appliance', item_name: 'Refrigerator', quantity: 1 },
    { category: 'utensil', item_name: 'Chef Knife', quantity: 1 },
    { category: 'utensil', item_name: 'Cutting Board', quantity: 1 },
    { category: 'utensil', item_name: 'Spatula', quantity: 1 },
    { category: 'utensil', item_name: 'Wooden Spoon', quantity: 2 },
    { category: 'utensil', item_name: 'Tongs', quantity: 1 },
    { category: 'utensil', item_name: 'Whisk', quantity: 1 },
    { category: 'storage', item_name: 'Food Storage Containers', quantity: 4 },
    { category: 'servingware', item_name: 'Serving Plates', quantity: 4 },
    { category: 'servingware', item_name: 'Serving Bowls', quantity: 2 },
  ],
  'well-equipped': [
    { category: 'cookware', item_name: 'Frying Pan (10")', quantity: 2 },
    { category: 'cookware', item_name: 'Frying Pan (12")', quantity: 1 },
    { category: 'cookware', item_name: 'Saucepan (2qt)', quantity: 2 },
    { category: 'cookware', item_name: 'Saucepan (4qt)', quantity: 1 },
    { category: 'cookware', item_name: 'Stock Pot (6qt)', quantity: 1 },
    { category: 'cookware', item_name: 'Stock Pot (12qt)', quantity: 1 },
    { category: 'cookware', item_name: 'Dutch Oven', quantity: 1 },
    { category: 'cookware', item_name: 'Cast Iron Skillet', quantity: 1 },
    { category: 'cookware', item_name: 'Baking Sheet', quantity: 3 },
    { category: 'cookware', item_name: 'Roasting Pan', quantity: 1 },
    { category: 'cookware', item_name: 'Muffin Tin', quantity: 1 },
    { category: 'appliance', item_name: 'Oven', quantity: 1 },
    { category: 'appliance', item_name: 'Stovetop (6 burners)', quantity: 1 },
    { category: 'appliance', item_name: 'Microwave', quantity: 1 },
    { category: 'appliance', item_name: 'Refrigerator', quantity: 1 },
    { category: 'appliance', item_name: 'Dishwasher', quantity: 1 },
    { category: 'appliance', item_name: 'Stand Mixer', quantity: 1 },
    { category: 'appliance', item_name: 'Food Processor', quantity: 1 },
    { category: 'appliance', item_name: 'Blender', quantity: 1 },
    { category: 'appliance', item_name: 'Immersion Blender', quantity: 1 },
    { category: 'utensil', item_name: 'Chef Knife', quantity: 2 },
    { category: 'utensil', item_name: 'Paring Knife', quantity: 2 },
    { category: 'utensil', item_name: 'Bread Knife', quantity: 1 },
    { category: 'utensil', item_name: 'Cutting Board (Large)', quantity: 2 },
    { category: 'utensil', item_name: 'Cutting Board (Small)', quantity: 1 },
    { category: 'utensil', item_name: 'Spatula', quantity: 2 },
    { category: 'utensil', item_name: 'Wooden Spoon', quantity: 3 },
    { category: 'utensil', item_name: 'Tongs', quantity: 2 },
    { category: 'utensil', item_name: 'Whisk', quantity: 2 },
    { category: 'utensil', item_name: 'Ladle', quantity: 1 },
    { category: 'utensil', item_name: 'Slotted Spoon', quantity: 1 },
    { category: 'utensil', item_name: 'Peeler', quantity: 2 },
    { category: 'utensil', item_name: 'Colander', quantity: 1 },
    { category: 'utensil', item_name: 'Measuring Cups', quantity: 1 },
    { category: 'utensil', item_name: 'Measuring Spoons', quantity: 1 },
    { category: 'utensil', item_name: 'Mixing Bowls (set)', quantity: 1 },
    { category: 'storage', item_name: 'Food Storage Containers', quantity: 10 },
    { category: 'storage', item_name: 'Plastic Wrap', quantity: 1 },
    { category: 'storage', item_name: 'Aluminum Foil', quantity: 1 },
    { category: 'storage', item_name: 'Zip-Lock Bags (assorted)', quantity: 1 },
    { category: 'servingware', item_name: 'Dinner Plates', quantity: 8 },
    { category: 'servingware', item_name: 'Serving Plates', quantity: 4 },
    { category: 'servingware', item_name: 'Serving Bowls', quantity: 4 },
    { category: 'servingware', item_name: 'Wine Glasses', quantity: 8 },
    { category: 'servingware', item_name: 'Water Glasses', quantity: 8 },
  ],
  minimal: [
    { category: 'cookware', item_name: 'Frying Pan', quantity: 1 },
    { category: 'cookware', item_name: 'Saucepan', quantity: 1 },
    { category: 'appliance', item_name: 'Oven', quantity: 1 },
    { category: 'appliance', item_name: 'Stovetop', quantity: 1 },
    { category: 'appliance', item_name: 'Refrigerator', quantity: 1 },
    { category: 'utensil', item_name: 'Knife', quantity: 1 },
    { category: 'utensil', item_name: 'Cutting Board', quantity: 1 },
    { category: 'utensil', item_name: 'Spatula', quantity: 1 },
  ],
}

export async function applyKitchenTemplate(
  clientId: string,
  template: 'basic' | 'well-equipped' | 'minimal'
): Promise<number> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const items = KITCHEN_TEMPLATES[template]
  if (!items) throw new Error(`Unknown template: ${template}`)

  const rows = items.map((item) => ({
    tenant_id: user.tenantId!,
    client_id: clientId,
    category: item.category,
    item_name: item.item_name,
    quantity: item.quantity,
    condition: 'good' as KitchenCondition,
    last_verified_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('client_kitchen_inventory' as any).insert(rows)

  if (error) throw new Error(`Failed to apply template: ${error.message}`)
  revalidatePath(`/clients/${clientId}`)
  return rows.length
}
