// Module 3: Allergy and Dietary Condition Reference
// Lookup by slug, search, filter by category/severity

import type { DietaryConditionReference, ConditionCategory, ConditionSeverity } from './types'
import rawData from './data/dietary-conditions.json'

const conditions: DietaryConditionReference[] = rawData as DietaryConditionReference[]

/** Get all conditions */
export function getAllConditions(): DietaryConditionReference[] {
  return conditions
}

/** Lookup a condition by slug */
export function getConditionBySlug(slug: string): DietaryConditionReference | undefined {
  return conditions.find((c) => c.slug === slug)
}

/** Lookup a condition by id */
export function getConditionById(id: string): DietaryConditionReference | undefined {
  return conditions.find((c) => c.id === id)
}

/** Search conditions by name or summary text */
export function searchConditions(query: string): DietaryConditionReference[] {
  if (!query.trim()) return conditions
  const q = query.toLowerCase().trim()
  return conditions.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.avoidList.some((item) => item.toLowerCase().includes(q)) ||
      c.linkedAllergenTags.some((tag) => tag.toLowerCase().includes(q)) ||
      c.linkedDietFlags.some((flag) => flag.toLowerCase().includes(q))
  )
}

/** Filter conditions by category */
export function filterByCategory(category: ConditionCategory): DietaryConditionReference[] {
  return conditions.filter((c) => c.category === category)
}

/** Filter conditions by severity */
export function filterBySeverity(severity: ConditionSeverity): DietaryConditionReference[] {
  return conditions.filter((c) => c.severity === severity)
}

/** Find conditions linked to a specific allergen tag */
export function findByAllergenTag(tag: string): DietaryConditionReference[] {
  const t = tag.toLowerCase()
  return conditions.filter((c) => c.linkedAllergenTags.some((at) => at.toLowerCase() === t))
}

/** Find conditions linked to a specific diet flag */
export function findByDietFlag(flag: string): DietaryConditionReference[] {
  const f = flag.toLowerCase()
  return conditions.filter((c) => c.linkedDietFlags.some((df) => df.toLowerCase() === f))
}

/** Get all unique categories present in the data */
export function getConditionCategories(): ConditionCategory[] {
  const cats = new Set<ConditionCategory>()
  for (const c of conditions) cats.add(c.category)
  return Array.from(cats)
}

/** Category display labels */
export const CONDITION_CATEGORY_LABELS: Record<ConditionCategory, string> = {
  allergy: 'Allergy',
  intolerance: 'Intolerance',
  autoimmune: 'Autoimmune',
  religious: 'Religious',
  lifestyle: 'Lifestyle',
  metabolic: 'Metabolic',
}

/** Severity display labels */
export const SEVERITY_LABELS: Record<ConditionSeverity, string> = {
  life_threatening: 'Life-Threatening',
  medical: 'Medical',
  strict_observance: 'Strict Observance',
  preference: 'Preference',
}

/** Severity badge colors for UI */
export const SEVERITY_COLORS: Record<ConditionSeverity, string> = {
  life_threatening: 'bg-red-900/50 text-red-300 border-red-700',
  medical: 'bg-orange-900/50 text-orange-300 border-orange-700',
  strict_observance: 'bg-blue-900/50 text-blue-300 border-blue-700',
  preference: 'bg-stone-700/50 text-stone-300 border-stone-600',
}
