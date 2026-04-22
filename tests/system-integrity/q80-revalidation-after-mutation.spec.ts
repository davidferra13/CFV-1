/**
 * Q80: Cache Revalidation After Mutation
 *
 * Uses the shared server-action mutation inventory contract to ratchet
 * page-facing write safety. Every page-facing server action mutation must
 * expose revalidation through the shared contract. Audit-only writes and
 * non-page-facing internal paths remain explicit machine-readable exemptions.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q80-revalidation-after-mutation.spec.ts
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { buildServerActionMutationInventory } from '@/lib/auth/server-action-inventory'

const ROOT = process.cwd()
const HIGH_RISK_ACTION_FILES = [
  'lib/events/actions.ts',
  'lib/clients/actions.ts',
  'lib/quotes/actions.ts',
  'lib/finance/expense-actions.ts',
  'lib/menus/actions.ts',
  'lib/chef/profile-actions.ts',
] as const
const PRIVILEGED_ACTION_FILES = [
  'lib/admin/chef-admin-actions.ts',
  'lib/auth/permission-actions.ts',
  'lib/contracts/actions.ts',
  'lib/finance/expense-actions.ts',
  'lib/clients/actions.ts',
] as const
// Shared-contract baseline after broadening Q80 to the canonical mutation inventory.
// Ratchets should only move downward unless the mutation registry itself is narrowed.
const MAX_MISSING_REVALIDATION_FUNCTIONS = 320
const MAX_MISSING_REVALIDATION_IMPORT_FILES = 65

function buildInventory() {
  return buildServerActionMutationInventory({
    includeRoots: ['lib', 'app'],
  })
}

test.describe('Q80: Cache revalidation after mutation', () => {
  test('shared mutation inventory discovers page-facing writes', () => {
    const inventory = buildInventory()

    console.log(
      `\nQ80: ${inventory.totalMutationFunctions} mutation functions found. ` +
        `${inventory.pageFacingMutationFunctionCount} page-facing, ` +
        `${inventory.auditOnlyMutationFunctionCount} audit-only exempt, ` +
        `${inventory.pathExemptMutationFunctionCount} path-exempt.`
    )
    console.log(
      `Q80 privileged policy: ${inventory.privilegedMutationFunctionCount} privileged, ` +
        `${inventory.criticalMutationFunctionCount} critical, ` +
        `${inventory.sensitiveMutationFunctionCount} sensitive, ` +
        `${inventory.privilegedPolicyViolationFunctionCount} with contract violations.`
    )

    expect(inventory.totalMutationFunctions).toBeGreaterThan(0)
    expect(inventory.pageFacingMutationFunctionCount).toBeGreaterThan(0)
    expect(inventory.privilegedMutationFunctionCount).toBeGreaterThan(0)
    expect(inventory.criticalMutationFunctionCount).toBeGreaterThan(0)
  })

  test('page-facing mutation contract records missing revalidation per function', () => {
    const inventory = buildInventory()

    if (inventory.missingRevalidationFunctionCount > 0) {
      console.warn(
        `\nQ80 WARNING - page-facing mutation functions without revalidation:\n` +
          inventory.missingRevalidationFunctionIds.map((id) => `  STALE-UI: ${id}`).join('\n')
      )
    }

    expect(
      inventory.missingRevalidationFunctionCount,
      `Too many page-facing mutation functions without revalidation (stale UI risk). Missing:\n${inventory.missingRevalidationFunctionIds.join('\n')}`
    ).toBeLessThan(MAX_MISSING_REVALIDATION_FUNCTIONS)
  })

  test('page-facing mutation contract records missing next/cache imports per file', () => {
    const inventory = buildInventory()

    if (inventory.missingRevalidationImportFileCount > 0) {
      console.warn(
        `\nQ80 WARNING - page-facing mutation files missing next/cache import coverage:\n` +
          inventory.filesWithoutRevalidationImport.map((id) => `  NO-IMPORT: ${id}`).join('\n')
      )
    }

    expect(
      inventory.missingRevalidationImportFileCount,
      `Page-facing mutation files should import revalidation helpers from next/cache:\n${inventory.filesWithoutRevalidationImport.join('\n')}`
    ).toBeLessThan(MAX_MISSING_REVALIDATION_IMPORT_FILES)
  })

  test('high-risk action files surface revalidation imports through the shared contract', () => {
    const inventory = buildInventory()
    const fileSummaryByPath = new Map(
      inventory.fileSummaries.map((summary) => [summary.relativeFilePath, summary])
    )
    const missing: string[] = []

    for (const relPath of HIGH_RISK_ACTION_FILES) {
      if (!existsSync(resolve(ROOT, relPath))) continue

      const summary = fileSummaryByPath.get(relPath)
      if (!summary?.hasPageFacingMutations) continue

      if (summary.missingRevalidationImportForPageFacingMutations) {
        missing.push(relPath)
      }
    }

    if (missing.length > 0) {
      console.warn(
        `\nQ80 CRITICAL - high-risk action files missing shared revalidation import coverage:\n` +
          missing.map((entry) => `  MISSING: ${entry}`).join('\n')
      )
    }

    expect(
      missing,
      `High-risk action files with page-facing mutations must import next/cache revalidation helpers:\n${missing.join('\n')}`
    ).toHaveLength(0)
  })

  test('privileged mutation files are explicitly classified by the shared contract', () => {
    const inventory = buildInventory()
    const privilegedEntriesByFile = new Map<string, number>()
    const missing: string[] = []

    for (const entry of inventory.entries) {
      if (entry.classification !== 'page-facing') continue
      if (entry.privilegedPolicy.level === 'standard') continue
      privilegedEntriesByFile.set(
        entry.relativeFilePath,
        (privilegedEntriesByFile.get(entry.relativeFilePath) ?? 0) + 1
      )
    }

    for (const relPath of PRIVILEGED_ACTION_FILES) {
      if (!existsSync(resolve(ROOT, relPath))) continue

      if (!privilegedEntriesByFile.has(relPath)) {
        missing.push(relPath)
      }
    }

    if (missing.length > 0) {
      console.warn(
        `\nQ80 CRITICAL - privileged mutation files missing shared policy classification:\n` +
          missing.map((entry) => `  MISSING: ${entry}`).join('\n')
      )
    }

    expect(
      missing,
      `Expected the shared mutation contract to classify privileged mutation files explicitly:\n${missing.join('\n')}`
    ).toHaveLength(0)
  })

  test('shared mutation contract models exemptions explicitly', () => {
    const inventory = buildInventory()

    expect(
      inventory.entries.some((entry) => entry.classification === 'page-facing'),
      'expected page-facing mutation actions to remain represented in the shared contract'
    ).toBe(true)
    expect(
      inventory.entries.some(
        (entry) =>
          entry.classification !== 'page-facing' &&
          entry.contract.status === 'exempt' &&
          entry.contract.exemption !== null
      ),
      'expected audit-only or path-exempt mutations to expose explicit exemption metadata'
    ).toBe(true)
  })
})
