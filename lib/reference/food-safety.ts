// Module 1: Food Safety Quick Reference
// Search, filter, and lookup functions for food safety data

import type { FoodSafetyEntry, FoodSafetyCategory } from './types'
import rawData from './data/food-safety.json'

const entries: FoodSafetyEntry[] = rawData as FoodSafetyEntry[]

/** Search food safety entries by keyword (matches item name and keywords array) */
export function searchFoodSafety(query: string): FoodSafetyEntry[] {
  if (!query.trim()) return entries
  const q = query.toLowerCase().trim()
  return entries.filter(
    (e) => e.item.toLowerCase().includes(q) || e.keywords.some((k) => k.toLowerCase().includes(q))
  )
}

/** Filter entries by category */
export function filterByCategory(category: FoodSafetyCategory): FoodSafetyEntry[] {
  return entries.filter((e) => e.category === category)
}

/** Search within a specific category */
export function searchInCategory(query: string, category: FoodSafetyCategory): FoodSafetyEntry[] {
  const categoryEntries = filterByCategory(category)
  if (!query.trim()) return categoryEntries
  const q = query.toLowerCase().trim()
  return categoryEntries.filter(
    (e) => e.item.toLowerCase().includes(q) || e.keywords.some((k) => k.toLowerCase().includes(q))
  )
}

/** Get a single entry by id */
export function getFoodSafetyEntry(id: string): FoodSafetyEntry | undefined {
  return entries.find((e) => e.id === id)
}

/** Get all entries */
export function getAllFoodSafetyEntries(): FoodSafetyEntry[] {
  return entries
}

/** Get all unique categories present in the data */
export function getFoodSafetyCategories(): FoodSafetyCategory[] {
  const cats = new Set<FoodSafetyCategory>()
  for (const e of entries) cats.add(e.category)
  return Array.from(cats)
}

/** Get sous vide entries only */
export function getSousVideEntries(): FoodSafetyEntry[] {
  return entries.filter(
    (e) => e.item.toLowerCase().includes('sous vide') || e.keywords.includes('sous vide')
  )
}

/** Category display labels */
export const CATEGORY_LABELS: Record<FoodSafetyCategory, string> = {
  protein: 'Protein',
  produce: 'Produce',
  dairy: 'Dairy',
  seafood: 'Seafood',
  egg: 'Eggs',
  grain: 'Grains',
  prepared: 'Prepared Foods',
}
