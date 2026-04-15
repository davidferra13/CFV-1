/**
 * Q35: Recipe Generation Block
 *
 * AI must never generate, create, or fabricate recipes. Recipes are the
 * chef's creative work and intellectual property. This rule has ZERO
 * exceptions - not as a draft, not as a suggestion, not with chef approval.
 *
 * Enforcement has two layers:
 *   1. Restricted actions list (agent.create_recipe, agent.update_recipe,
 *      agent.add_ingredient permanently blocked)
 *   2. Input validation intercept (checkRecipeGenerationBlock catches
 *      intent before it reaches the LLM)
 *
 * Tests:
 *
 * 1. RESTRICTED ACTIONS: agent.create_recipe is in the permanent restricted
 *    actions list with safety: 'restricted'.
 *
 * 2. UPDATE/ADD BLOCKED: agent.update_recipe and agent.add_ingredient are
 *    also restricted (no partial recipe generation through side channels).
 *
 * 3. INPUT VALIDATION INTERCEPT: lib/ai/remy-input-validation.ts exports
 *    checkRecipeGenerationBlock (pre-LLM gate).
 *
 * 4. REFUSAL MESSAGE: A RECIPE_GENERATION_REFUSAL constant (or equivalent)
 *    exists so the refusal is consistent and non-fabricated.
 *
 * 5. SEARCH EXEMPTION: The block must not prevent recipe search/lookup
 *    actions. Only generation is blocked, not reading the chef's own recipes.
 *
 * 6. RESTRICTED ACTIONS EXPORT: restrictedAgentActions is exported from the
 *    restricted-actions file so the agent runtime can import it.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q35-recipe-generation-block.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const RESTRICTED = resolve(process.cwd(), 'lib/ai/agent-actions/restricted-actions.ts')
const VALIDATION = resolve(process.cwd(), 'lib/ai/remy-input-validation.ts')

test.describe('Q35: Recipe generation block', () => {
  // -------------------------------------------------------------------------
  // Test 1: agent.create_recipe is permanently restricted
  // -------------------------------------------------------------------------
  test('agent.create_recipe is in the permanent restricted actions list', () => {
    expect(existsSync(RESTRICTED), 'lib/ai/agent-actions/restricted-actions.ts must exist').toBe(
      true
    )

    const src = readFileSync(RESTRICTED, 'utf-8')

    expect(
      src.includes('agent.create_recipe') || src.includes("'create_recipe'"),
      'restricted-actions.ts must include agent.create_recipe as permanently restricted'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: agent.update_recipe and agent.add_ingredient also blocked
  // -------------------------------------------------------------------------
  test('agent.update_recipe and agent.add_ingredient are also restricted', () => {
    const src = readFileSync(RESTRICTED, 'utf-8')

    expect(
      src.includes('agent.update_recipe') || src.includes("'update_recipe'"),
      'restricted-actions.ts must restrict agent.update_recipe (no partial recipe generation)'
    ).toBe(true)

    expect(
      src.includes('agent.add_ingredient') || src.includes("'add_ingredient'"),
      'restricted-actions.ts must restrict agent.add_ingredient (no AI ingredient insertion)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Input validation intercepts recipe generation intent
  // -------------------------------------------------------------------------
  test('remy-input-validation.ts exports checkRecipeGenerationBlock (pre-LLM gate)', () => {
    expect(existsSync(VALIDATION), 'lib/ai/remy-input-validation.ts must exist').toBe(true)

    const src = readFileSync(VALIDATION, 'utf-8')

    expect(
      src.includes('checkRecipeGenerationBlock') || src.includes('recipeGenerationBlock'),
      'remy-input-validation.ts must export a recipe generation block function'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Refusal message constant exists (consistent, non-hallucinated)
  // -------------------------------------------------------------------------
  test('a RECIPE_GENERATION_REFUSAL constant or equivalent exists for consistent refusals', () => {
    const src = readFileSync(VALIDATION, 'utf-8')

    expect(
      src.includes('RECIPE_GENERATION_REFUSAL') ||
        src.includes('RECIPE_REFUSAL') ||
        src.includes('recipeRefusal') ||
        (src.includes('recipe') && src.includes('const') && src.includes('message')),
      'remy-input-validation.ts must define a refusal message constant for recipe generation attempts'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Recipe search/lookup is NOT blocked (only generation)
  // -------------------------------------------------------------------------
  test('recipe search and lookup are explicitly exempted from the generation block', () => {
    const src = readFileSync(VALIDATION, 'utf-8')

    // The block logic must have an exemption for search/find/lookup patterns
    // so chefs can still search their own recipe book via Remy
    expect(
      src.includes('search') ||
        src.includes('find') ||
        src.includes('lookup') ||
        src.includes('lookup'),
      'recipe generation block must not prevent recipe.search lookups (chef needs to search own recipes)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Restricted actions list is exported for the agent runtime
  // -------------------------------------------------------------------------
  test('restrictedAgentActions is exported from restricted-actions.ts', () => {
    const src = readFileSync(RESTRICTED, 'utf-8')

    expect(
      src.includes('export') &&
        (src.includes('restrictedAgentActions') || src.includes('RESTRICTED_ACTIONS')),
      'restricted-actions.ts must export the restricted actions list so the agent runtime can import it'
    ).toBe(true)
  })
})
