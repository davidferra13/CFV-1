// Shopping List Server Actions
// Mobile-optimized grocery shopping mode: create, manage, and complete shopping lists

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type ShoppingItem = {
  name: string
  quantity: number | null
  unit: string | null
  category: string
  checked: boolean
  estimated_price_cents: number | null
  actual_price_cents: number | null
  vendor: string | null
  notes: string | null
}

export type ShoppingList = {
  id: string
  chef_id: string
  name: string
  event_id: string | null
  items: ShoppingItem[]
  status: 'active' | 'completed'
  total_estimated_cents: number | null
  total_actual_cents: number | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

// --- Schemas ---

const ShoppingItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  category: z.string().default('Other'),
  checked: z.boolean().default(false),
  estimated_price_cents: z.number().int().nullable().default(null),
  actual_price_cents: z.number().int().nullable().default(null),
  vendor: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
})

const CreateShoppingListSchema = z.object({
  name: z.string().min(1, 'List name is required'),
  event_id: z.string().uuid().nullable().optional(),
  items: z.array(ShoppingItemSchema).default([]),
})

// Map from ingredient DB categories to shopping categories
const INGREDIENT_CATEGORY_MAP: Record<string, string> = {
  produce: 'Produce',
  fresh_herb: 'Produce',
  dry_herb: 'Spices/Seasonings',
  protein: 'Protein',
  dairy: 'Dairy',
  pantry: 'Pantry',
  baking: 'Pantry',
  canned: 'Pantry',
  condiment: 'Pantry',
  spice: 'Spices/Seasonings',
  oil: 'Pantry',
  frozen: 'Frozen',
  beverage: 'Beverages',
  alcohol: 'Beverages',
  specialty: 'Other',
  other: 'Other',
}

function mapIngredientCategory(dbCategory: string): string {
  return INGREDIENT_CATEGORY_MAP[dbCategory] || 'Other'
}

// --- Actions ---

export async function createShoppingList(input: z.infer<typeof CreateShoppingListSchema>) {
  const user = await requireChef()
  const validated = CreateShoppingListSchema.parse(input)
  const supabase = createServerClient()

  // Compute estimated total
  const totalEstimatedCents = validated.items.reduce(
    (sum, item) => sum + (item.estimated_price_cents || 0),
    0
  )

  const { data, error } = await supabase
    .from('shopping_lists' as any)
    .insert({
      chef_id: user.tenantId!,
      name: validated.name,
      event_id: validated.event_id || null,
      items: JSON.stringify(validated.items),
      status: 'active',
      total_estimated_cents: totalEstimatedCents || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createShoppingList] Error:', error)
    throw new Error('Failed to create shopping list')
  }

  revalidatePath('/shopping')
  return { success: true, id: (data as any).id }
}

export async function createShoppingListFromEvent(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch event info
  const { data: event } = await supabase
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  // Use the existing grocery list fetch logic
  const { fetchGroceryListData } = await import('@/lib/documents/generate-grocery-list')
  const groceryData = await fetchGroceryListData(eventId)

  if (!groceryData) throw new Error('No menu or recipe data found for this event')

  // Convert grocery data to shopping items
  const items: ShoppingItem[] = []

  for (const section of groceryData.stop1Sections) {
    for (const item of section.items) {
      items.push({
        name: item.ingredientName,
        quantity: item.quantity,
        unit: item.unit,
        category: mapSectionToCategory(section.sectionName),
        checked: false,
        estimated_price_cents: item.lastPriceCents
          ? Math.round(item.quantity * item.lastPriceCents)
          : null,
        actual_price_cents: null,
        vendor: null,
        notes: item.isOptional ? 'Optional' : null,
      })
    }
  }

  // Add stop2 (liquor/beverage) items
  for (const item of groceryData.stop2Items) {
    items.push({
      name: item.ingredientName,
      quantity: item.quantity,
      unit: item.unit,
      category: 'Beverages',
      checked: false,
      estimated_price_cents: item.lastPriceCents
        ? Math.round(item.quantity * item.lastPriceCents)
        : null,
      actual_price_cents: null,
      vendor: null,
      notes: null,
    })
  }

  const clientName = (event.client as any)?.full_name || 'Client'
  const listName = event.occasion
    ? `${event.occasion} - ${clientName}`
    : `Shopping for ${clientName} (${event.event_date})`

  const totalEstimatedCents = items.reduce(
    (sum, item) => sum + (item.estimated_price_cents || 0),
    0
  )

  const { data, error } = await supabase
    .from('shopping_lists' as any)
    .insert({
      chef_id: user.tenantId!,
      name: listName,
      event_id: eventId,
      items: JSON.stringify(items),
      status: 'active',
      total_estimated_cents: totalEstimatedCents || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createShoppingListFromEvent] Error:', error)
    throw new Error('Failed to create shopping list from event')
  }

  revalidatePath('/shopping')
  return { success: true, id: (data as any).id }
}

function mapSectionToCategory(sectionName: string): string {
  const map: Record<string, string> = {
    PROTEINS: 'Protein',
    PRODUCE: 'Produce',
    'DAIRY / FATS': 'Dairy',
    PANTRY: 'Pantry',
    SPECIALTY: 'Other',
  }
  return map[sectionName] || 'Other'
}

export async function getActiveShoppingLists() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('shopping_lists' as any)
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getActiveShoppingLists] Error:', error)
    throw new Error('Failed to fetch shopping lists')
  }

  return ((data as any[]) || []).map(normalizeList)
}

export async function getShoppingList(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('shopping_lists' as any)
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getShoppingList] Error:', error)
    throw new Error('Shopping list not found')
  }

  return normalizeList(data as any)
}

export async function toggleItem(listId: string, itemIndex: number) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch current list
  const { data: list } = await supabase
    .from('shopping_lists' as any)
    .select('items')
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!list) throw new Error('Shopping list not found')

  const items = parseItems((list as any).items)
  if (itemIndex < 0 || itemIndex >= items.length) throw new Error('Invalid item index')

  items[itemIndex].checked = !items[itemIndex].checked

  const { error } = await supabase
    .from('shopping_lists' as any)
    .update({ items: JSON.stringify(items) })
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[toggleItem] Error:', error)
    throw new Error('Failed to toggle item')
  }

  revalidatePath(`/shopping/${listId}`)
  return { success: true, checked: items[itemIndex].checked }
}

export async function updateItemPrice(
  listId: string,
  itemIndex: number,
  actualPriceCents: number
) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: list } = await supabase
    .from('shopping_lists' as any)
    .select('items')
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!list) throw new Error('Shopping list not found')

  const items = parseItems((list as any).items)
  if (itemIndex < 0 || itemIndex >= items.length) throw new Error('Invalid item index')

  items[itemIndex].actual_price_cents = actualPriceCents

  const totalActualCents = items.reduce(
    (sum, item) => sum + (item.actual_price_cents || 0),
    0
  )

  const { error } = await supabase
    .from('shopping_lists' as any)
    .update({
      items: JSON.stringify(items),
      total_actual_cents: totalActualCents || null,
    })
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[updateItemPrice] Error:', error)
    throw new Error('Failed to update item price')
  }

  revalidatePath(`/shopping/${listId}`)
  return { success: true }
}

export async function updateShoppingList(
  id: string,
  data: { name?: string; items?: ShoppingItem[] }
) {
  const user = await requireChef()
  const supabase = createServerClient()

  const updatePayload: Record<string, any> = {}
  if (data.name) updatePayload.name = data.name
  if (data.items) {
    updatePayload.items = JSON.stringify(data.items)
    updatePayload.total_estimated_cents =
      data.items.reduce((sum, item) => sum + (item.estimated_price_cents || 0), 0) || null
    updatePayload.total_actual_cents =
      data.items.reduce((sum, item) => sum + (item.actual_price_cents || 0), 0) || null
  }

  const { error } = await supabase
    .from('shopping_lists' as any)
    .update(updatePayload)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[updateShoppingList] Error:', error)
    throw new Error('Failed to update shopping list')
  }

  revalidatePath(`/shopping/${id}`)
  revalidatePath('/shopping')
  return { success: true }
}

export async function completeShoppingList(listId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch current items to compute totals
  const { data: list } = await supabase
    .from('shopping_lists' as any)
    .select('items')
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!list) throw new Error('Shopping list not found')

  const items = parseItems((list as any).items)
  const totalEstimatedCents = items.reduce(
    (sum, item) => sum + (item.estimated_price_cents || 0),
    0
  )
  const totalActualCents = items.reduce(
    (sum, item) => sum + (item.actual_price_cents || 0),
    0
  )

  const { error } = await supabase
    .from('shopping_lists' as any)
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_estimated_cents: totalEstimatedCents || null,
      total_actual_cents: totalActualCents || null,
    })
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[completeShoppingList] Error:', error)
    throw new Error('Failed to complete shopping list')
  }

  revalidatePath(`/shopping/${listId}`)
  revalidatePath('/shopping')
  return { success: true }
}

export async function convertToExpense(listId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch the completed list
  const { data: list } = await supabase
    .from('shopping_lists' as any)
    .select('*')
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!list) throw new Error('Shopping list not found')

  const normalized = normalizeList(list as any)
  if (normalized.status !== 'completed') {
    throw new Error('Shopping list must be completed before converting to expense')
  }

  const amountCents = normalized.total_actual_cents || normalized.total_estimated_cents
  if (!amountCents || amountCents <= 0) {
    throw new Error('No price data to create expense from')
  }

  // Create expense via the existing expense action
  const { createExpense } = await import('@/lib/expenses/actions')
  const result = await createExpense({
    amount_cents: amountCents,
    category: 'food_cost',
    payment_method: 'card',
    description: `Grocery shopping: ${normalized.name}`,
    expense_date: normalized.completed_at || new Date().toISOString().split('T')[0],
    event_id: normalized.event_id || undefined,
    notes: `Created from shopping list. ${normalized.items.length} items.`,
    is_business: true,
  })

  revalidatePath('/expenses')
  revalidatePath('/shopping')
  return result
}

// --- Helpers ---

function parseItems(items: any): ShoppingItem[] {
  if (typeof items === 'string') {
    try {
      return JSON.parse(items)
    } catch {
      return []
    }
  }
  if (Array.isArray(items)) return items
  return []
}

function normalizeList(row: any): ShoppingList {
  return {
    id: row.id,
    chef_id: row.chef_id,
    name: row.name,
    event_id: row.event_id,
    items: parseItems(row.items),
    status: row.status,
    total_estimated_cents: row.total_estimated_cents,
    total_actual_cents: row.total_actual_cents,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
