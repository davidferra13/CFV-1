// Module 2: Substitution Engine
// Search by ingredient, filter by reason, curated rules only (Phase 1)

import type { SubstitutionRule, SubstitutionReason, QualityImpact } from './types'
import rawData from './data/substitutions.json'

const rules: SubstitutionRule[] = rawData as SubstitutionRule[]

/** Search substitutions by source ingredient name */
export function searchSubstitutions(query: string): SubstitutionRule[] {
  if (!query.trim()) return rules
  const q = query.toLowerCase().trim()
  return rules.filter(
    (r) =>
      r.sourceIngredient.toLowerCase().includes(q) || r.targetIngredient.toLowerCase().includes(q)
  )
}

/** Find substitutions for a specific source ingredient */
export function findSubstitutesFor(ingredient: string): SubstitutionRule[] {
  const q = ingredient.toLowerCase().trim()
  return rules.filter((r) => r.sourceIngredient.toLowerCase().includes(q))
}

/** Filter substitutions by reason */
export function filterByReason(reason: SubstitutionReason): SubstitutionRule[] {
  return rules.filter((r) => r.reasons.includes(reason))
}

/** Search substitutions filtered by reason */
export function searchByIngredientAndReason(
  ingredient: string,
  reason: SubstitutionReason
): SubstitutionRule[] {
  const q = ingredient.toLowerCase().trim()
  return rules.filter(
    (r) =>
      r.reasons.includes(reason) &&
      (r.sourceIngredient.toLowerCase().includes(q) || r.targetIngredient.toLowerCase().includes(q))
  )
}

/** Filter substitutions by quality impact threshold */
export function filterByMaxQualityImpact(maxImpact: QualityImpact): SubstitutionRule[] {
  const order: QualityImpact[] = ['none', 'minor', 'moderate', 'significant']
  const maxIndex = order.indexOf(maxImpact)
  return rules.filter((r) => order.indexOf(r.qualityImpact) <= maxIndex)
}

/** Get a single rule by id */
export function getSubstitutionRule(id: string): SubstitutionRule | undefined {
  return rules.find((r) => r.id === id)
}

/** Get all rules */
export function getAllSubstitutions(): SubstitutionRule[] {
  return rules
}

/** Get all unique reasons present in the data */
export function getAvailableReasons(): SubstitutionReason[] {
  const reasons = new Set<SubstitutionReason>()
  for (const r of rules) {
    for (const reason of r.reasons) reasons.add(reason)
  }
  return Array.from(reasons)
}

/** Reason display labels */
export const REASON_LABELS: Record<SubstitutionReason, string> = {
  allergy_dairy: 'Dairy Allergy',
  allergy_egg: 'Egg Allergy',
  allergy_gluten: 'Gluten Allergy',
  allergy_nut: 'Nut Allergy',
  allergy_shellfish: 'Shellfish Allergy',
  allergy_soy: 'Soy Allergy',
  allergy_fish: 'Fish Allergy',
  allergy_sesame: 'Sesame Allergy',
  dietary_vegan: 'Vegan',
  dietary_vegetarian: 'Vegetarian',
  dietary_keto: 'Keto',
  dietary_kosher: 'Kosher',
  dietary_halal: 'Halal',
  dietary_low_sodium: 'Low Sodium',
  dietary_paleo: 'Paleo',
  availability: 'Availability',
  cost: 'Cost Savings',
  preference: 'Preference',
}

/** Quality impact display labels */
export const QUALITY_LABELS: Record<QualityImpact, string> = {
  none: 'No impact',
  minor: 'Minor difference',
  moderate: 'Moderate difference',
  significant: 'Significant difference',
}
