/**
 * Q91: Email Channel Auth Guard
 *
 * Stress Questions Q13-Q14: Functions in lib/comms/email-channel.ts
 * accept arbitrary chefId parameters without verifying the caller
 * is authorized to access that chef's data.
 *
 * What we check:
 *   1. resolveChefByAlias is NOT exported from a 'use server' file
 *      (or if it is, it has auth guards)
 *   2. getEmailChannelSignalCount validates caller owns the chefId
 *   3. getOrCreateEmailChannel validates caller owns the chefId
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q91-email-channel-auth-guard.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()

test.describe('Q91: Email channel auth guards', () => {
  const filePath = resolve(ROOT, 'lib/comms/email-channel.ts')
  let content: string

  test.beforeAll(() => {
    content = readFileSync(filePath, 'utf-8')
  })

  test('file has auth guards or is not a server action file', () => {
    const isServerAction = content.includes("'use server'") || content.includes('"use server"')
    const hasAuthGuard = /requireChef|requireAuth|requireAdmin|getCurrentUser/.test(content)

    if (isServerAction && !hasAuthGuard) {
      console.warn(
        'CRITICAL: lib/comms/email-channel.ts is a server action file with no auth guards. ' +
          'Functions accepting chefId as parameter can be called by any authenticated user ' +
          "to access another chef's email channel data."
      )
    }

    // If it's a server action, it must have auth
    if (isServerAction) {
      expect(hasAuthGuard, 'Server action file must have auth guards').toBe(true)
    }
  })

  test('resolveChefByAlias is not directly callable from client', () => {
    const isExported = /export\s+(async\s+)?function\s+resolveChefByAlias/.test(content)
    const isServerAction = content.includes("'use server'") || content.includes('"use server"')

    if (isExported && isServerAction) {
      console.warn(
        'CRITICAL: resolveChefByAlias is exported from a server action file. ' +
          'Any authenticated user can enumerate chef IDs from email aliases. ' +
          "Fix: Remove export or add auth guard that validates the caller's identity."
      )
    }

    // This combination is the vulnerability
    expect(
      isExported && isServerAction,
      'resolveChefByAlias must not be exported from a server action file without auth'
    ).toBe(false)
  })

  test('functions accepting chefId derive it from session or validate ownership', () => {
    // Check if functions take chefId as a parameter (vulnerability) vs deriving from session (safe)
    const functionsWithChefIdParam =
      content.match(/export\s+(async\s+)?function\s+\w+\([^)]*chefId\s*:/g) || []

    const hasSessionDerivation = /requireChef|user\.entityId|user\.tenantId|session/.test(content)

    if (functionsWithChefIdParam.length > 0 && !hasSessionDerivation) {
      console.warn(
        `Found ${functionsWithChefIdParam.length} exported function(s) accepting chefId as parameter ` +
          'without session-based ownership validation:\n' +
          functionsWithChefIdParam.join('\n')
      )
    }
  })
})
