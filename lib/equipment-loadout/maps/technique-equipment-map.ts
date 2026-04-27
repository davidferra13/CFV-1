// Layer B: Technique -> Equipment mapping
// Parses recipe method text via regex to infer equipment needs.
// Uses the inference catalog directly.

import { matchInferenceRules } from '@/lib/equipment/inference-catalog'
import type { LoadoutEntry } from '../types'

/**
 * Extract equipment from recipe method text using technique inference.
 */
export function extractTechniqueEquipment(
  recipeId: string,
  recipeName: string,
  methodText: string
): LoadoutEntry[] {
  const matches = matchInferenceRules(methodText)
  const entries: LoadoutEntry[] = []
  const seen = new Set<string>()

  for (const { rule, match } of matches) {
    if (rule.signal_type !== 'technique') continue

    for (const equipName of rule.equipment) {
      if (seen.has(equipName)) continue
      seen.add(equipName)

      entries.push({
        name: equipName,
        canonical_name: equipName,
        category_slug: rule.category_slug,
        quantity: 1,
        scaling: 'fixed',
        source_layer: 'technique_inference',
        reason: [`${recipeName}: "${match}" technique`],
        is_essential: true,
      })
    }
  }

  return entries
}
