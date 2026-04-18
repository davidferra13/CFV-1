'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

// ============================================
// TYPES
// ============================================

export type AisleSection =
  | 'produce'
  | 'meat_seafood'
  | 'dairy_eggs'
  | 'bakery'
  | 'frozen'
  | 'pantry_dry'
  | 'canned'
  | 'condiments_sauces'
  | 'spices'
  | 'beverages'
  | 'deli'
  | 'bulk'
  | 'international'
  | 'baking'
  | 'snacks'
  | 'household'
  | 'other'

export type ListStatus = 'active' | 'completed' | 'archived'

export interface SmartGroceryItem {
  id: string
  list_id: string
  name: string
  quantity: number
  unit: string | null
  aisle_section: AisleSection
  is_checked: boolean
  notes: string | null
  sort_order: number
  price_estimate_cents: number | null
}

export interface SmartGroceryList {
  id: string
  chef_id: string
  name: string
  event_id: string | null
  status: ListStatus
  created_at: string
  completed_at: string | null
  items?: SmartGroceryItem[]
}

// ============================================
// AISLE KEYWORD MAP (deterministic, no AI)
// ============================================

const AISLE_KEYWORDS: Record<AisleSection, string[]> = {
  produce: [
    'apple',
    'banana',
    'orange',
    'lemon',
    'lime',
    'grape',
    'berry',
    'blueberry',
    'strawberry',
    'raspberry',
    'avocado',
    'tomato',
    'potato',
    'onion',
    'garlic',
    'ginger',
    'carrot',
    'celery',
    'broccoli',
    'cauliflower',
    'spinach',
    'kale',
    'lettuce',
    'arugula',
    'cabbage',
    'pepper',
    'cucumber',
    'zucchini',
    'squash',
    'mushroom',
    'herb',
    'basil',
    'cilantro',
    'parsley',
    'mint',
    'dill',
    'thyme',
    'rosemary',
    'scallion',
    'shallot',
    'leek',
    'asparagus',
    'artichoke',
    'beet',
    'radish',
    'turnip',
    'sweet potato',
    'corn',
    'pea',
    'green bean',
    'mango',
    'pineapple',
    'melon',
    'watermelon',
    'peach',
    'pear',
    'plum',
    'fig',
    'pomegranate',
    'kiwi',
    'coconut',
    'jalapeño',
    'habanero',
    'serrano',
    'fennel',
    'chard',
    'endive',
    'watercress',
    'sprout',
  ],
  meat_seafood: [
    'chicken',
    'beef',
    'pork',
    'lamb',
    'turkey',
    'duck',
    'veal',
    'bison',
    'steak',
    'ground beef',
    'ground turkey',
    'ground pork',
    'bacon',
    'sausage',
    'ham',
    'ribs',
    'tenderloin',
    'brisket',
    'roast',
    'chop',
    'salmon',
    'tuna',
    'shrimp',
    'prawn',
    'crab',
    'lobster',
    'scallop',
    'cod',
    'halibut',
    'tilapia',
    'trout',
    'mahi',
    'swordfish',
    'bass',
    'clam',
    'mussel',
    'oyster',
    'squid',
    'calamari',
    'octopus',
    'anchovy',
    'sardine',
    'fish',
    'meat',
    'seafood',
    'poultry',
  ],
  dairy_eggs: [
    'milk',
    'cream',
    'half and half',
    'butter',
    'cheese',
    'cheddar',
    'mozzarella',
    'parmesan',
    'gruyere',
    'brie',
    'gouda',
    'feta',
    'ricotta',
    'cream cheese',
    'sour cream',
    'yogurt',
    'egg',
    'whipping cream',
    'heavy cream',
    'cottage cheese',
    'mascarpone',
    'buttermilk',
    'ghee',
    'kefir',
  ],
  bakery: [
    'bread',
    'baguette',
    'roll',
    'croissant',
    'muffin',
    'bagel',
    'pita',
    'naan',
    'tortilla',
    'wrap',
    'bun',
    'sourdough',
    'brioche',
    'focaccia',
    'ciabatta',
    'english muffin',
    'cake',
    'pie crust',
  ],
  frozen: [
    'frozen',
    'ice cream',
    'sorbet',
    'gelato',
    'popsicle',
    'frozen pizza',
    'frozen vegetable',
    'frozen fruit',
    'frozen dinner',
    'frozen fries',
    'frozen waffle',
    'frozen pie',
  ],
  pantry_dry: [
    'pasta',
    'spaghetti',
    'penne',
    'fusilli',
    'linguine',
    'fettuccine',
    'rice',
    'quinoa',
    'couscous',
    'barley',
    'oat',
    'granola',
    'cereal',
    'flour',
    'sugar',
    'brown sugar',
    'powdered sugar',
    'cornstarch',
    'breadcrumb',
    'panko',
    'cracker',
    'chip',
    'popcorn',
    'pretzel',
    'nut',
    'almond',
    'walnut',
    'pecan',
    'cashew',
    'peanut',
    'pistachio',
    'dried fruit',
    'raisin',
    'date',
    'lentil',
    'bean',
    'chickpea',
    'black bean',
    'kidney bean',
    'navy bean',
    'split pea',
  ],
  canned: [
    'canned',
    'tomato paste',
    'tomato sauce',
    'diced tomato',
    'crushed tomato',
    'coconut milk',
    'broth',
    'stock',
    'soup',
    'tuna can',
    'sardine can',
    'bean can',
    'corn can',
    'pumpkin puree',
    'chipotle in adobo',
  ],
  condiments_sauces: [
    'ketchup',
    'mustard',
    'mayonnaise',
    'mayo',
    'hot sauce',
    'soy sauce',
    'worcestershire',
    'bbq sauce',
    'salsa',
    'sriracha',
    'tabasco',
    'vinegar',
    'balsamic',
    'ranch',
    'dressing',
    'relish',
    'horseradish',
    'teriyaki',
    'hoisin',
    'fish sauce',
    'oyster sauce',
    'tahini',
    'pesto',
    'marinara',
    'alfredo',
    'jam',
    'jelly',
    'honey',
    'maple syrup',
    'molasses',
    'miso',
  ],
  spices: [
    'salt',
    'pepper',
    'cumin',
    'paprika',
    'chili powder',
    'cayenne',
    'cinnamon',
    'nutmeg',
    'clove',
    'allspice',
    'cardamom',
    'coriander',
    'turmeric',
    'curry',
    'oregano',
    'bay leaf',
    'sage',
    'tarragon',
    'marjoram',
    'saffron',
    'star anise',
    'five spice',
    'garlic powder',
    'onion powder',
    'smoked paprika',
    'italian seasoning',
    'everything bagel',
    'vanilla extract',
    'vanilla',
    'almond extract',
    'seasoning',
  ],
  beverages: [
    'water',
    'sparkling water',
    'soda',
    'juice',
    'orange juice',
    'apple juice',
    'coffee',
    'tea',
    'kombucha',
    'lemonade',
    'wine',
    'beer',
    'champagne',
    'prosecco',
    'vodka',
    'gin',
    'rum',
    'tequila',
    'whiskey',
    'bourbon',
    'brandy',
    'vermouth',
    'bitters',
    'tonic',
    'club soda',
    'energy drink',
    'coconut water',
    'oat milk',
    'almond milk',
    'soy milk',
  ],
  deli: [
    'deli',
    'sliced turkey',
    'sliced ham',
    'salami',
    'prosciutto',
    'pepperoni',
    'pastrami',
    'roast beef',
    'mortadella',
    'capicola',
    'hummus',
    'prepared salad',
    'rotisserie',
  ],
  bulk: [
    'bulk',
    'grain',
    'seed',
    'flaxseed',
    'chia seed',
    'hemp seed',
    'sunflower seed',
    'pumpkin seed',
    'trail mix',
    'dried bean',
  ],
  international: [
    'nori',
    'seaweed',
    'tofu',
    'tempeh',
    'edamame',
    'wonton',
    'dumpling',
    'rice noodle',
    'udon',
    'soba',
    'ramen',
    'kimchi',
    'gochujang',
    'sambal',
    'curry paste',
    'coconut cream',
    'tamarind',
    'plantain',
    'jerk',
    'harissa',
    "za'atar",
    'sumac',
    'tahini',
    'halloumi',
    'paneer',
    'ghee',
    'chutney',
    'naan',
    'injera',
    'mochi',
  ],
  baking: [
    'baking powder',
    'baking soda',
    'yeast',
    'chocolate chip',
    'cocoa',
    'chocolate',
    'sprinkle',
    'food coloring',
    'gelatin',
    'pectin',
    'parchment',
    'cupcake liner',
    'pie crust',
    'puff pastry',
    'phyllo',
    'fondant',
    'marzipan',
    'meringue powder',
    'cream of tartar',
    'corn syrup',
    'condensed milk',
    'evaporated milk',
  ],
  snacks: [
    'snack',
    'cookie',
    'cracker',
    'granola bar',
    'protein bar',
    'fruit snack',
    'dried mango',
    'beef jerky',
    'rice cake',
    'peanut butter',
    'nutella',
  ],
  household: [
    'paper towel',
    'napkin',
    'plastic wrap',
    'aluminum foil',
    'foil',
    'parchment paper',
    'zip bag',
    'storage bag',
    'trash bag',
    'sponge',
    'dish soap',
    'detergent',
    'bleach',
    'glove',
    'toothpick',
    'skewer',
    'candle',
    'lighter',
    'match',
  ],
  other: [],
}

/**
 * Deterministic aisle assignment from item name.
 * Checks multi-word matches first, then single-word.
 * No AI involved.
 */
function detectAisle(itemName: string): AisleSection {
  const lower = itemName.toLowerCase().trim()

  for (const [aisle, keywords] of Object.entries(AISLE_KEYWORDS) as [AisleSection, string[]][]) {
    if (aisle === 'other') continue
    for (const kw of keywords) {
      if (kw.includes(' ')) {
        // Multi-word: check substring
        if (lower.includes(kw)) return aisle
      }
    }
  }

  for (const [aisle, keywords] of Object.entries(AISLE_KEYWORDS) as [AisleSection, string[]][]) {
    if (aisle === 'other') continue
    for (const kw of keywords) {
      if (!kw.includes(' ')) {
        // Single-word: check if any word in the item name matches
        const words = lower.split(/\s+/)
        if (words.some((w) => w === kw || w === kw + 's' || w === kw + 'es')) return aisle
      }
    }
  }

  return 'other'
}

// ============================================
// LIST CRUD
// ============================================

export async function createSmartList(name: string, eventId?: string) {
  const user = await requireChef()
  const db = await createServerClient()
  const id = randomUUID()

  const { data, error } = await db
    .from('smart_grocery_lists')
    .insert({
      id,
      chef_id: user.tenantId!,
      name,
      event_id: eventId || null,
      status: 'active',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create grocery list: ${error.message}`)

  revalidatePath('/grocery')
  return data as SmartGroceryList
}

export async function getSmartLists(status?: ListStatus) {
  const user = await requireChef()
  const db = await createServerClient()

  let query = db
    .from('smart_grocery_lists')
    .select('*, smart_grocery_items(id, is_checked)')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to load grocery lists: ${error.message}`)

  return (data ?? []) as (SmartGroceryList & {
    smart_grocery_items: { id: string; is_checked: boolean }[]
  })[]
}

export async function getSmartList(listId: string) {
  const user = await requireChef()
  const db: any = await createServerClient()

  const { data, error } = await db
    .from('smart_grocery_lists')
    .select('*, smart_grocery_items(*)')
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error) throw new Error(`Failed to load grocery list: ${error.message}`)

  // Sort items by sort_order
  if (data?.smart_grocery_items) {
    data.smart_grocery_items.sort(
      (a: SmartGroceryItem, b: SmartGroceryItem) => a.sort_order - b.sort_order
    )
  }

  // FC-G6: Attach allergy warnings when list is linked to an event
  let allergyWarnings: string[] = []
  if (data.event_id) {
    try {
      const { data: evt } = await db
        .from('events')
        .select('allergies, dietary_restrictions, client_id')
        .eq('id', data.event_id)
        .single()
      if (evt) {
        const evA = (evt.allergies as string[] | null) ?? []
        const evD = (evt.dietary_restrictions as string[] | null) ?? []
        if (evA.length > 0) allergyWarnings.push(`Allergies: ${evA.join(', ')}`)
        if (evD.length > 0) allergyWarnings.push(`Dietary: ${evD.join(', ')}`)
        if (evt.client_id) {
          const { data: cl } = await db
            .from('clients')
            .select('allergies, dietary_restrictions')
            .eq('id', evt.client_id)
            .single()
          for (const a of (cl?.allergies as string[] | null) ?? []) {
            if (!evA.includes(a)) allergyWarnings.push(`Client allergy: ${a}`)
          }
          for (const d of (cl?.dietary_restrictions as string[] | null) ?? []) {
            if (!evD.includes(d)) allergyWarnings.push(`Client dietary: ${d}`)
          }
        }
      }
    } catch {
      /* non-blocking */
    }
  }

  return { ...data, allergyWarnings } as SmartGroceryList & {
    smart_grocery_items: SmartGroceryItem[]
    allergyWarnings: string[]
  }
}

// ============================================
// ITEM CRUD
// ============================================

export async function addItem(
  listId: string,
  data: {
    name: string
    quantity?: number
    unit?: string
    aisle_section?: AisleSection
    notes?: string
    price_estimate_cents?: number
  }
) {
  const user = await requireChef()
  const db = await createServerClient()

  // Verify list ownership
  const { data: list, error: listError } = await db
    .from('smart_grocery_lists')
    .select('id')
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (listError || !list) throw new Error('Grocery list not found')

  // Get max sort_order
  const { data: maxItem } = await db
    .from('smart_grocery_items')
    .select('sort_order')
    .eq('list_id', listId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxItem?.sort_order ?? -1) + 1

  // Auto-detect aisle if not provided
  const aisleSection = data.aisle_section || detectAisle(data.name)

  // Check chef's aisle preferences for override
  const { data: pref } = await db
    .from('aisle_preferences')
    .select('aisle_section')
    .eq('chef_id', user.tenantId!)
    .ilike('item_keyword', `%${data.name.toLowerCase()}%`)
    .limit(1)
    .single()

  const finalAisle = pref?.aisle_section || aisleSection

  const id = randomUUID()
  const { data: item, error } = await db
    .from('smart_grocery_items')
    .insert({
      id,
      list_id: listId,
      name: data.name,
      quantity: data.quantity ?? 1,
      unit: data.unit || null,
      aisle_section: finalAisle,
      notes: data.notes || null,
      sort_order: nextOrder,
      price_estimate_cents: data.price_estimate_cents || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add item: ${error.message}`)

  revalidatePath('/grocery')
  return item as SmartGroceryItem
}

export async function updateItem(
  itemId: string,
  data: Partial<{
    name: string
    quantity: number
    unit: string | null
    aisle_section: AisleSection
    notes: string | null
    price_estimate_cents: number | null
  }>
) {
  const user = await requireChef()
  const db = await createServerClient()

  // Verify ownership through list
  const { data: item, error: findError } = await db
    .from('smart_grocery_items')
    .select('list_id, smart_grocery_lists!inner(chef_id)')
    .eq('id', itemId)
    .single()

  if (findError || !item) throw new Error('Item not found')
  const listData = item.smart_grocery_lists as unknown as { chef_id: string }
  if (listData.chef_id !== user.tenantId!) throw new Error('Not authorized')

  const { error } = await db.from('smart_grocery_items').update(data).eq('id', itemId)

  if (error) throw new Error(`Failed to update item: ${error.message}`)

  revalidatePath('/grocery')
}

export async function removeItem(itemId: string) {
  const user = await requireChef()
  const db = await createServerClient()

  // Verify ownership
  const { data: item, error: findError } = await db
    .from('smart_grocery_items')
    .select('list_id, smart_grocery_lists!inner(chef_id)')
    .eq('id', itemId)
    .single()

  if (findError || !item) throw new Error('Item not found')
  const listData = item.smart_grocery_lists as unknown as { chef_id: string }
  if (listData.chef_id !== user.tenantId!) throw new Error('Not authorized')

  const { error } = await db.from('smart_grocery_items').delete().eq('id', itemId)

  if (error) throw new Error(`Failed to remove item: ${error.message}`)

  revalidatePath('/grocery')
}

export async function toggleItemChecked(itemId: string) {
  const user = await requireChef()
  const db = await createServerClient()

  // Get current state + verify ownership
  const { data: item, error: findError } = await db
    .from('smart_grocery_items')
    .select('is_checked, list_id, smart_grocery_lists!inner(chef_id)')
    .eq('id', itemId)
    .single()

  if (findError || !item) throw new Error('Item not found')
  const listData = item.smart_grocery_lists as unknown as { chef_id: string }
  if (listData.chef_id !== user.tenantId!) throw new Error('Not authorized')

  const { error } = await db
    .from('smart_grocery_items')
    .update({ is_checked: !item.is_checked })
    .eq('id', itemId)

  if (error) throw new Error(`Failed to toggle item: ${error.message}`)

  revalidatePath('/grocery')
}

export async function reorderItems(listId: string, itemIds: string[]) {
  const user = await requireChef()
  const db = await createServerClient()

  // Verify list ownership
  const { data: list, error: listError } = await db
    .from('smart_grocery_lists')
    .select('id')
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (listError || !list) throw new Error('Grocery list not found')

  // Update sort_order for each item
  const updates = itemIds.map((id, index) =>
    db.from('smart_grocery_items').update({ sort_order: index }).eq('id', id).eq('list_id', listId)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(`Failed to reorder: ${failed.error.message}`)

  revalidatePath('/grocery')
}

// ============================================
// LIST STATUS CHANGES
// ============================================

export async function completeList(listId: string) {
  const user = await requireChef()
  const db = await createServerClient()

  const { error } = await db
    .from('smart_grocery_lists')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to complete list: ${error.message}`)

  revalidatePath('/grocery')
}

export async function archiveList(listId: string) {
  const user = await requireChef()
  const db = await createServerClient()

  const { error } = await db
    .from('smart_grocery_lists')
    .update({ status: 'archived' })
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to archive list: ${error.message}`)

  revalidatePath('/grocery')
}

export async function duplicateList(listId: string, newName: string) {
  const user = await requireChef()
  const db = await createServerClient()

  // Get original list + items
  const { data: original, error: fetchError } = await db
    .from('smart_grocery_lists')
    .select('*, smart_grocery_items(*)')
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !original) throw new Error('List not found')

  // Create new list
  const newId = randomUUID()
  const { error: createError } = await db.from('smart_grocery_lists').insert({
    id: newId,
    chef_id: user.tenantId!,
    name: newName,
    event_id: null,
    status: 'active',
  })

  if (createError) throw new Error(`Failed to duplicate list: ${createError.message}`)

  // Copy items
  const items = (original.smart_grocery_items as SmartGroceryItem[]) || []
  if (items.length > 0) {
    const newItems = items.map((item) => ({
      id: randomUUID(),
      list_id: newId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      aisle_section: item.aisle_section,
      is_checked: false,
      notes: item.notes,
      sort_order: item.sort_order,
      price_estimate_cents: item.price_estimate_cents,
    }))

    const { error: itemsError } = await db.from('smart_grocery_items').insert(newItems)

    if (itemsError) throw new Error(`Failed to copy items: ${itemsError.message}`)
  }

  revalidatePath('/grocery')
  return { id: newId }
}

// ============================================
// SMART FEATURES
// ============================================

export async function autoAssignAisles(listId: string) {
  const user = await requireChef()
  const db = await createServerClient()

  // Get list items
  const { data: list, error: listError } = await db
    .from('smart_grocery_lists')
    .select('id')
    .eq('id', listId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (listError || !list) throw new Error('List not found')

  const { data: items, error: itemsError } = await db
    .from('smart_grocery_items')
    .select('id, name, aisle_section')
    .eq('list_id', listId)

  if (itemsError) throw new Error(`Failed to load items: ${itemsError.message}`)

  // Load chef's preferences
  const { data: prefs } = await db
    .from('aisle_preferences')
    .select('item_keyword, aisle_section')
    .eq('chef_id', user.tenantId!)

  const prefMap = new Map<string, string>()
  for (const p of prefs ?? []) {
    prefMap.set(p.item_keyword.toLowerCase(), p.aisle_section)
  }

  // Assign aisles
  const updates: Promise<any>[] = []
  for (const item of items ?? []) {
    const lower = item.name.toLowerCase()
    // Check preferences first, then keyword detection
    let newAisle: AisleSection | undefined
    for (const [keyword, aisle] of prefMap.entries()) {
      if (lower.includes(keyword)) {
        newAisle = aisle as AisleSection
        break
      }
    }
    if (!newAisle) {
      newAisle = detectAisle(item.name)
    }

    if (newAisle !== item.aisle_section) {
      updates.push(
        db
          .from('smart_grocery_items')
          .update({ aisle_section: newAisle })
          .eq('id', item.id) as unknown as Promise<any>
      )
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates)
  }

  revalidatePath('/grocery')
  return { updated: updates.length }
}

export async function saveAislePreference(storeName: string, keyword: string, aisle: AisleSection) {
  const user = await requireChef()
  const db = await createServerClient()

  const { error } = await db.from('aisle_preferences').upsert(
    {
      id: randomUUID(),
      chef_id: user.tenantId!,
      store_name: storeName,
      item_keyword: keyword.toLowerCase(),
      aisle_section: aisle,
    },
    { onConflict: 'chef_id,store_name,item_keyword' }
  )

  if (error) throw new Error(`Failed to save preference: ${error.message}`)

  revalidatePath('/grocery')
}
