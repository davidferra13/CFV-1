// Dietary Constraint Enforcement Layer
// Hard-blocks unsafe menu assignments for guests with severe/life-threatening allergies.
// Formula > AI: pure deterministic lookup, no LLM.
//
// This layer sits between menu assignment and confirmation. It returns a verdict:
//   BLOCK  = assignment must be prevented (severe/life-threatening + direct allergen match)
//   WARN   = chef should review (moderate severity or may_contain risk)
//   CLEAR  = no conflicts detected
//
// Cross-contact risk: ingredients that share processing lines with allergens
// are flagged as WARN even when not direct matches.

import {
  checkDishAgainstAllergens,
  ingredientMatchesAllergen,
  type AllergenConflict,
} from '@/lib/menus/allergen-check'

// ── Types ─────────────────────────────────────────────────────────────

export type ConstraintVerdict = 'BLOCK' | 'WARN' | 'CLEAR'

export type DishVerdict = {
  dishId: string
  dishName: string
  verdict: ConstraintVerdict
  conflicts: AllergenConflict[]
  crossContactRisks: CrossContactRisk[]
  reason: string | null
}

export type GuestMenuVerdict = {
  guestName: string
  guestId: string
  overallVerdict: ConstraintVerdict
  dishes: DishVerdict[]
  blockCount: number
  warnCount: number
}

export type MenuEnforcementResult = {
  canProceed: boolean
  guests: GuestMenuVerdict[]
  totalBlocks: number
  totalWarns: number
  summary: string
}

export type CrossContactRisk = {
  ingredientName: string
  riskAllergen: string
  reason: string
}

// ── Cross-Contact Risk Database ───────────────────────────────────────
// Ingredients commonly processed on shared lines with allergens.
// This catches risks that pure ingredient matching misses.

export const CROSS_CONTACT_RISKS: Record<string, { allergen: string; reason: string }[]> = {
  chocolate: [
    { allergen: 'milk', reason: 'Most chocolate is processed on dairy lines' },
    { allergen: 'tree_nuts', reason: 'Chocolate often processed with tree nuts' },
    { allergen: 'soy', reason: 'Soy lecithin is common in chocolate' },
  ],
  'dark chocolate': [
    { allergen: 'milk', reason: 'Dark chocolate often has trace dairy from shared lines' },
    { allergen: 'tree_nuts', reason: 'Often processed alongside nut varieties' },
  ],
  granola: [
    { allergen: 'tree_nuts', reason: 'Granola typically processed with nuts' },
    { allergen: 'peanuts', reason: 'Shared facility risk' },
  ],
  'oat milk': [{ allergen: 'gluten', reason: 'Oats often cross-contaminated with wheat' }],
  oats: [{ allergen: 'gluten', reason: 'Oats frequently processed on wheat lines' }],
  'fried food': [
    { allergen: 'wheat', reason: 'Shared fryer oil with breaded items' },
    { allergen: 'fish', reason: 'Shared fryer oil risk' },
    { allergen: 'shellfish', reason: 'Shared fryer oil risk' },
  ],
  vinaigrette: [{ allergen: 'sesame', reason: 'Sesame oil sometimes used in vinaigrettes' }],
  pesto: [
    { allergen: 'tree_nuts', reason: 'Traditional pesto contains pine nuts' },
    { allergen: 'dairy', reason: 'Traditional pesto contains parmesan' },
  ],
  curry: [
    { allergen: 'peanuts', reason: 'Many curry pastes contain peanuts' },
    { allergen: 'shellfish', reason: 'Shrimp paste common in Thai/Malaysian curry' },
    { allergen: 'fish', reason: 'Fish sauce common in curry preparations' },
  ],
  'ice cream': [
    { allergen: 'tree_nuts', reason: 'Shared production lines with nut flavors' },
    { allergen: 'peanuts', reason: 'Shared production lines' },
    { allergen: 'eggs', reason: 'Custard-based ice cream contains eggs' },
  ],
  bread: [
    { allergen: 'sesame', reason: 'Bakeries often process sesame on same lines' },
    { allergen: 'tree_nuts', reason: 'Shared bakery equipment' },
    { allergen: 'eggs', reason: 'Egg wash on many breads' },
    { allergen: 'dairy', reason: 'Butter/milk in many breads' },
  ],
  'soy sauce': [
    { allergen: 'wheat', reason: 'Traditional soy sauce is brewed with wheat' },
    { allergen: 'gluten', reason: 'Contains wheat gluten' },
  ],
}

// ── Severity Thresholds ───────────────────────────────────────────────

const BLOCKING_SEVERITIES = new Set([
  'severe',
  'life-threatening',
  'life_threatening',
  'anaphylaxis',
  'anaphylactic',
])

function isBlockingSeverity(severity: string): boolean {
  return BLOCKING_SEVERITIES.has(severity.toLowerCase().replace(/[\s-]/g, '_'))
}

// ── Core Enforcement ──────────────────────────────────────────────────

function checkCrossContactRisks(
  ingredients: { name: string }[],
  allergyRecords: { allergen: string; severity: string }[]
): CrossContactRisk[] {
  const risks: CrossContactRisk[] = []

  for (const ingredient of ingredients) {
    const normalized = ingredient.name.toLowerCase().trim()

    // Check each cross-contact entry
    for (const [riskIngredient, riskEntries] of Object.entries(CROSS_CONTACT_RISKS)) {
      if (normalized.includes(riskIngredient)) {
        for (const risk of riskEntries) {
          // Only flag if the guest actually has this allergy
          const hasAllergy = allergyRecords.some(
            (a) => a.allergen.toLowerCase().replace(/[^a-z_]/g, '') === risk.allergen
          )
          if (hasAllergy) {
            risks.push({
              ingredientName: ingredient.name,
              riskAllergen: risk.allergen,
              reason: risk.reason,
            })
          }
        }
      }
    }
  }

  return risks
}

/**
 * Evaluate a single dish against a single guest's dietary constraints.
 */
export function evaluateDishForGuest(
  dishId: string,
  dishName: string,
  ingredients: { name: string }[],
  allergyRecords: { allergen: string; severity: string; confirmed_by_chef: boolean }[]
): DishVerdict {
  // Direct allergen conflicts
  const conflicts = checkDishAgainstAllergens(dishId, dishName, ingredients, allergyRecords)

  // Cross-contact risks
  const crossContactRisks = checkCrossContactRisks(ingredients, allergyRecords)

  // Determine verdict
  let verdict: ConstraintVerdict = 'CLEAR'
  let reason: string | null = null

  // Any severe/life-threatening direct match = BLOCK
  const blockingConflicts = conflicts.filter((c) => isBlockingSeverity(c.severity))
  if (blockingConflicts.length > 0) {
    verdict = 'BLOCK'
    const allergens = [...new Set(blockingConflicts.map((c) => c.allergen))].join(', ')
    reason = `Contains ${allergens} (${blockingConflicts[0].severity} allergy)`
  }
  // Any moderate conflict or cross-contact risk = WARN
  else if (conflicts.length > 0 || crossContactRisks.length > 0) {
    verdict = 'WARN'
    if (conflicts.length > 0) {
      const allergens = [...new Set(conflicts.map((c) => c.allergen))].join(', ')
      reason = `Contains ${allergens} (review recommended)`
    } else {
      reason = `Cross-contact risk: ${crossContactRisks[0].reason}`
    }
  }

  return {
    dishId,
    dishName,
    verdict,
    conflicts,
    crossContactRisks,
    reason,
  }
}

/**
 * Evaluate an entire menu against all guests' dietary constraints.
 * Returns whether the menu can proceed or must be modified.
 */
export function enforceMenuConstraints(
  dishes: { id: string; name: string; ingredients: { name: string }[] }[],
  guests: {
    id: string
    name: string
    allergyRecords: { allergen: string; severity: string; confirmed_by_chef: boolean }[]
  }[]
): MenuEnforcementResult {
  const guestVerdicts: GuestMenuVerdict[] = []

  for (const guest of guests) {
    if (!guest.allergyRecords.length) {
      guestVerdicts.push({
        guestName: guest.name,
        guestId: guest.id,
        overallVerdict: 'CLEAR',
        dishes: [],
        blockCount: 0,
        warnCount: 0,
      })
      continue
    }

    const dishVerdicts: DishVerdict[] = []

    for (const dish of dishes) {
      const verdict = evaluateDishForGuest(
        dish.id,
        dish.name,
        dish.ingredients,
        guest.allergyRecords
      )

      // Only include dishes with findings
      if (verdict.verdict !== 'CLEAR') {
        dishVerdicts.push(verdict)
      }
    }

    const blockCount = dishVerdicts.filter((d) => d.verdict === 'BLOCK').length
    const warnCount = dishVerdicts.filter((d) => d.verdict === 'WARN').length
    const overallVerdict: ConstraintVerdict =
      blockCount > 0 ? 'BLOCK' : warnCount > 0 ? 'WARN' : 'CLEAR'

    guestVerdicts.push({
      guestName: guest.name,
      guestId: guest.id,
      overallVerdict,
      dishes: dishVerdicts,
      blockCount,
      warnCount,
    })
  }

  const totalBlocks = guestVerdicts.reduce((sum, g) => sum + g.blockCount, 0)
  const totalWarns = guestVerdicts.reduce((sum, g) => sum + g.warnCount, 0)
  const canProceed = totalBlocks === 0

  // Build summary
  let summary: string
  if (totalBlocks === 0 && totalWarns === 0) {
    summary = 'All dishes are safe for all guests'
  } else if (totalBlocks === 0) {
    summary = `${totalWarns} potential cross-contact risk${totalWarns > 1 ? 's' : ''} to review`
  } else {
    const blockedGuests = guestVerdicts
      .filter((g) => g.overallVerdict === 'BLOCK')
      .map((g) => g.guestName)
    summary = `BLOCKED: ${totalBlocks} allergen conflict${totalBlocks > 1 ? 's' : ''} for ${blockedGuests.join(', ')}. Menu must be modified.`
  }

  return {
    canProceed,
    guests: guestVerdicts,
    totalBlocks,
    totalWarns,
    summary,
  }
}
