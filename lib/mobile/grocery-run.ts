// Grocery Run Mode - Mobile in-store shopping experience
// Reuses generateGroceryList from lib/grocery, re-groups by store section for aisle flow.

import type { GroceryListData, GroceryItem } from '@/lib/grocery/generate-grocery-list'

// Store sections in typical grocery store walk order
export const STORE_SECTIONS = [
  'Produce',
  'Bakery',
  'Deli',
  'Meat/Seafood',
  'Dairy',
  'Frozen',
  'Pantry',
  'Other',
] as const

export type StoreSection = (typeof STORE_SECTIONS)[number]

// Map ingredient categories to store sections
const CATEGORY_TO_SECTION: Record<string, StoreSection> = {
  Produce: 'Produce',
  'Fresh Herbs': 'Produce',
  Proteins: 'Meat/Seafood',
  Dairy: 'Dairy',
  Frozen: 'Frozen',
  Bakery: 'Bakery',
  Pantry: 'Pantry',
  Spices: 'Pantry',
  'Dried Herbs': 'Pantry',
  'Oils & Fats': 'Pantry',
  'Canned Goods': 'Pantry',
  Baking: 'Pantry',
  Condiments: 'Pantry',
  Beverages: 'Pantry',
  Alcohol: 'Pantry',
  Specialty: 'Deli',
  Other: 'Other',
}

export interface GroceryRunItem {
  id: string
  ingredientId: string
  name: string
  quantity: string
  unit: string
  estimatedPriceCents: number | null
  recipes: string[]
  checked: boolean
  storeSection: StoreSection
}

export interface GroceryRunSection {
  section: StoreSection
  items: GroceryRunItem[]
  checkedCount: number
}

export interface GroceryRunData {
  eventId: string
  eventName: string
  eventDate: string | null
  guestCount: number
  sections: GroceryRunSection[]
  totalItems: number
  checkedCount: number
  estimatedTotalCents: number
}

function mapToStoreSection(category: string): StoreSection {
  return CATEGORY_TO_SECTION[category] ?? 'Other'
}

/**
 * Transform a GroceryListData into GroceryRunData grouped by store section.
 * Assigns each item a stable ID based on ingredientId.
 */
export function buildGroceryRunData(
  eventId: string,
  groceryList: GroceryListData,
  checkedIds: Set<string> = new Set()
): GroceryRunData {
  const sectionMap = new Map<StoreSection, GroceryRunItem[]>()

  // Initialize all sections
  for (const section of STORE_SECTIONS) {
    sectionMap.set(section, [])
  }

  let totalEstimate = 0

  for (const category of groceryList.categories) {
    for (const item of category.items) {
      const section = mapToStoreSection(category.name)
      const runItem: GroceryRunItem = {
        id: item.ingredientId,
        ingredientId: item.ingredientId,
        name: item.ingredientName,
        quantity: item.displayQuantity,
        unit: item.unit,
        estimatedPriceCents: null, // populated from budget data if available
        recipes: item.recipes,
        checked: checkedIds.has(item.ingredientId),
        storeSection: section,
      }
      sectionMap.get(section)!.push(runItem)
    }
  }

  // Build sections (only non-empty)
  const sections: GroceryRunSection[] = []
  let totalItems = 0
  let checkedCount = 0

  for (const section of STORE_SECTIONS) {
    const items = sectionMap.get(section) ?? []
    if (items.length === 0) continue

    const sectionChecked = items.filter((i) => i.checked).length
    sections.push({
      section,
      items,
      checkedCount: sectionChecked,
    })
    totalItems += items.length
    checkedCount += sectionChecked
  }

  return {
    eventId,
    eventName: groceryList.eventName,
    eventDate: groceryList.eventDate,
    guestCount: groceryList.guestCount,
    sections,
    totalItems,
    checkedCount,
    estimatedTotalCents: totalEstimate,
  }
}
