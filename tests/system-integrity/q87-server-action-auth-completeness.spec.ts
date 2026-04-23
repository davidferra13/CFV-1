/**
 * Q87: Server Action Auth Completeness
 *
 * Every exported async function in a 'use server' file must start with
 * an auth guard: requireChef(), requireClient(), requireAdmin(),
 * requireAuth(), or be explicitly documented as intentionally public.
 *
 * A server action without auth is callable by anyone via POST.
 * An unauthenticated user could mutate data, read private records,
 * or trigger billable side effects.
 *
 * Existing Q6 checks a subset. This checks ALL server action files
 * in the entire lib/ directory.
 *
 * Acceptable:
 *   - requireChef() / requireClient() / requireAdmin() / requireAuth()
 *     within the first 10 lines of the function body
 *   - Functions with a // public: <reason> comment documenting why
 *     no auth is needed
 *   - Functions that call another function which does the auth check
 *     (detected by calling a function that starts with "require")
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q87-server-action-auth-completeness.spec.ts
 */
import { test, expect } from '@playwright/test'
import { buildServerActionAuthInventory } from '@/lib/auth/server-action-inventory'

test.describe('Q87: Server action auth completeness', () => {
  // ---------------------------------------------------------------------------
  // Test 1: All exported server actions have auth guards
  // ---------------------------------------------------------------------------
  test('every exported async function in use-server files has an auth guard', () => {
    const inventory = buildServerActionAuthInventory({
      includeRoots: ['lib'],
    })

    expect(inventory.totalFiles).toBeGreaterThan(50)

    console.log(`\nQ87: ${inventory.totalFunctions} server actions scanned`)
    console.log(`  Auth-protected: ${inventory.authGuardedFunctionCount}`)
    console.log(`  Documented public: ${inventory.documentedPublicFunctionCount}`)
    console.log(`  File exempt: ${inventory.fileExemptFunctionCount}`)
    console.log(`  Missing auth: ${inventory.missingAuthFunctionCount}`)

    if (inventory.missingAuthFunctionCount > 0) {
      console.warn(
        `\nQ87 VIOLATIONS - Server actions without auth guards:\n` +
          inventory.missingAuthFunctionIds.map((id) => `  UNPROTECTED: ${id}`).join('\n')
      )
    }

    expect(
      inventory.missingAuthFunctionIds,
      `Server actions callable without authentication.\n` +
        `Anyone can invoke these via POST. Add requireChef/Client/Admin or document as // public:\n` +
        inventory.missingAuthFunctionIds.join('\n')
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Auth guards appear within the first few lines (not buried)
  // ---------------------------------------------------------------------------
  test('auth guards are called early in the function (within first 10 lines)', () => {
    const inventory = buildServerActionAuthInventory({
      includeRoots: ['lib'],
    })

    if (inventory.lateAuthFunctionCount > 0) {
      console.warn(
        `\nQ87 WARNING - Auth guards buried too deep in function body:\n` +
          inventory.lateAuthFunctionIds.map((id) => `  LATE AUTH: ${id}`).join('\n')
      )
    }

    // This is advisory. Not a hard failure, but worth tracking.
    // Late auth means code executes (including DB queries) before checking
    // if the user is authenticated.
    if (inventory.lateAuthFunctionCount > 10) {
      expect(
        inventory.lateAuthFunctionIds,
        `${inventory.lateAuthFunctionCount} server actions have auth guards buried >10 lines deep.\n` +
          `Code before the auth check runs for unauthenticated users:\n` +
          inventory.lateAuthFunctionIds.join('\n')
      ).toHaveLength(0)
    }
  })
})
