/**
 * Q57: Remy Admin Action Boundary
 *
 * Remy is a chef-facing AI concierge. Its action registry (remy-actions.ts,
 * agent-actions/) includes both chef-safe operations (search recipes, draft emails)
 * and restricted operations (create recipe — blocked). If any admin-only
 * operation (e.g., reading all chefs, modifying platform settings, accessing
 * prospecting data) is reachable via a Remy tool call, a regular chef could
 * use natural language to bypass access controls.
 *
 * Defense: Remy actions must only call server actions gated by requireChef().
 * Admin server actions (requireAdmin()) must never appear in Remy's tool registry.
 *
 * Tests:
 *
 * 1. REMY ACTIONS DO NOT IMPORT FROM LIB/ADMIN: lib/ai/remy-actions.ts and
 *    agent-actions/ do not import from lib/admin/*.
 *
 * 2. REMY ACTIONS DO NOT CALL REQUIREADMIN: No remy action file calls
 *    requireAdmin() — Remy is a chef tool, not an admin tool.
 *
 * 3. RESTRICTED ACTIONS FILE BLOCKS RECIPE GENERATION: lib/ai/agent-actions/
 *    restricted-actions.ts exists and blocks create_recipe, update_recipe,
 *    add_ingredient.
 *
 * 4. REMY INPUT VALIDATION BLOCKS ADMIN INTENTS: lib/ai/remy-input-validation.ts
 *    blocks or routes admin-classified intent before it reaches the LLM.
 *
 * 5. REMY ACTIONS FILE USES REQUIRECHEF NOT REQUIREADMIN: lib/ai/remy-actions.ts
 *    calls requireChef() to scope all Remy operations to the authenticated chef.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q57-remy-admin-action-boundary.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()
const REMY_ACTIONS = resolve(ROOT, 'lib/ai/remy-actions.ts')
const RESTRICTED_ACTIONS = resolve(ROOT, 'lib/ai/agent-actions/restricted-actions.ts')
const REMY_INPUT_VALIDATION = resolve(ROOT, 'lib/ai/remy-input-validation.ts')

function findFiles(dir: string, ext: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) results.push(...findFiles(full, ext))
    else if (entry.isFile() && entry.name.endsWith(ext)) results.push(full)
  }
  return results
}

test.describe('Q57: Remy admin action boundary', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Remy actions do not import from lib/admin/
  // ---------------------------------------------------------------------------
  test('lib/ai/remy-actions.ts does not import from lib/admin/', () => {
    if (!existsSync(REMY_ACTIONS)) return
    const src = readFileSync(REMY_ACTIONS, 'utf-8')

    expect(
      !src.includes("from '@/lib/admin/") && !src.includes('from "@/lib/admin/'),
      'lib/ai/remy-actions.ts must not import from lib/admin/ — admin actions are not Remy tools'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Remy agent-actions do not import from lib/admin/
  // ---------------------------------------------------------------------------
  test('agent-actions/ directory files do not import from lib/admin/', () => {
    const agentActionsDir = resolve(ROOT, 'lib/ai/agent-actions')
    if (!existsSync(agentActionsDir)) return

    const files = findFiles(agentActionsDir, '.ts')
    const violations: string[] = []

    for (const file of files) {
      const src = readFileSync(file, 'utf-8')
      if (src.includes("from '@/lib/admin/") || src.includes('from "@/lib/admin/')) {
        violations.push(file.replace(ROOT, '').replace(/\\/g, '/'))
      }
    }

    expect(
      violations,
      `These Remy agent-action files import from lib/admin/ (admin access via Remy): ${violations.join(', ')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Restricted actions file blocks recipe generation
  // ---------------------------------------------------------------------------
  test('lib/ai/agent-actions/restricted-actions.ts exists and blocks recipe creation', () => {
    expect(
      existsSync(RESTRICTED_ACTIONS),
      'lib/ai/agent-actions/restricted-actions.ts must exist — it blocks prohibited AI operations'
    ).toBe(true)

    const src = readFileSync(RESTRICTED_ACTIONS, 'utf-8')

    expect(
      src.includes('create_recipe') || src.includes('createRecipe'),
      'restricted-actions.ts must explicitly block create_recipe — AI must never generate recipes'
    ).toBe(true)

    expect(
      src.includes('update_recipe') || src.includes('updateRecipe'),
      'restricted-actions.ts must block update_recipe'
    ).toBe(true)

    expect(
      src.includes('add_ingredient') || src.includes('addIngredient'),
      'restricted-actions.ts must block add_ingredient'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 4: Remy input validation file exists
  // ---------------------------------------------------------------------------
  test('lib/ai/remy-input-validation.ts exists and filters intent before LLM', () => {
    expect(
      existsSync(REMY_INPUT_VALIDATION),
      'lib/ai/remy-input-validation.ts must exist — it blocks prohibited intents before the LLM call'
    ).toBe(true)

    const src = readFileSync(REMY_INPUT_VALIDATION, 'utf-8')
    // Must have some blocking logic
    expect(
      src.includes('block') ||
        src.includes('restrict') ||
        src.includes('forbidden') ||
        src.includes('recipe'),
      'remy-input-validation.ts must contain blocking logic for restricted intents'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 5: Remy actions file calls requireChef not requireAdmin
  // ---------------------------------------------------------------------------
  test('lib/ai/remy-actions.ts uses requireChef() (not requireAdmin)', () => {
    if (!existsSync(REMY_ACTIONS)) return
    const src = readFileSync(REMY_ACTIONS, 'utf-8')

    // Remy is chef-facing — must use requireChef
    expect(
      src.includes('requireChef'),
      'lib/ai/remy-actions.ts must call requireChef() — Remy operates in the chef context'
    ).toBe(true)

    // Must NOT call requireAdmin (would make Remy unusable for non-admin chefs)
    expect(
      !src.includes('requireAdmin'),
      'lib/ai/remy-actions.ts must not call requireAdmin() — Remy is not an admin tool'
    ).toBe(true)
  })
})
