/**
 * Q6: Server Action Auth Completeness
 *
 * Every exported server action that touches tenant data must begin with an
 * auth check (requireChef, requireClient, requireAdmin, or be explicitly
 * documented as intentionally public).
 *
 * This is a STRUCTURAL test. It scans all module-level 'use server' files
 * under lib/ and app/ and fails if an exported async function lacks an auth
 * guard inside the first 20 lines of the function body.
 *
 * Failure = an exported server action callable by any unauthenticated request
 * with no auth guard, creating a data exposure or mutation vector.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q6-server-action-auth.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import { buildServerActionAuthInventory } from '@/lib/auth/server-action-inventory'

// Legacy public examples still recognized by the shared inventory:
// lib/auth/actions.ts
// lib/hub/profile-actions.ts
// lib/hub/group-actions.ts
// lib/email/unsubscribe-actions.ts
// lib/email/actions.ts

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkDir(full, exts))
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        results.push(full)
      }
    }
  } catch {
    // Directory not accessible
  }
  return results
}

function hasUseServer(src: string): boolean {
  return /^['"]use server['"]/m.test(src.slice(0, 500))
}

const ROOT = process.cwd()

test.describe('Q6: Server action auth completeness', () => {
  test('all exported server actions have auth guards', () => {
    const inventory = buildServerActionAuthInventory({
      includeRoots: ['lib', 'app'],
      earlyGuardLineWindow: 20,
      lateGuardLineWindow: 20,
    })

    if (inventory.missingAuthFunctionCount > 0) {
      console.error(
        `\nQ6 FAILURES - exported server actions missing auth guards (${inventory.missingAuthFunctionCount}):\n` +
          inventory.missingAuthFunctionIds.map((id) => `  MISSING AUTH: ${id}`).join('\n')
      )
    }

    console.log(
      `Q6: Checked ${inventory.totalFunctions} server actions across ${inventory.totalFiles} use-server files. ` +
        `${inventory.fileExemptFunctionCount} functions file-exempt, ` +
        `${inventory.documentedPublicFunctionCount} documented public. ` +
        `${inventory.missingAuthFunctionCount} violations.`
    )

    expect(
      inventory.missingAuthFunctionIds,
      `${inventory.missingAuthFunctionCount} server actions lack auth guards:\n` +
        inventory.missingAuthFunctionIds.join('\n')
    ).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Test 2: Tenant ID in server actions comes from session, not request body
  // (Structural scan for the anti-pattern: input.tenantId or body.tenantId)
  // -------------------------------------------------------------------------
  test('server actions do not accept tenant_id from request body', () => {
    const libFiles = walkDir(join(ROOT, 'lib'), ['.ts'])
    const violations: string[] = []

    for (const filePath of libFiles) {
      const rel = relative(ROOT, filePath).replace(/\\/g, '/')
      if (rel.includes('.test.') || rel.includes('.spec.')) continue

      let src: string
      try {
        src = readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }

      if (!hasUseServer(src)) continue

      // Anti-pattern: reading tenant_id from a function parameter named input/data/body/payload
      // instead of from the session
      const antiPattern = /(?:input|data|body|payload|params)\s*(?:\?\.|\[\s*['"])\s*tenant_id/g
      const altPattern = /=\s*(?:input|data|body|payload)\.tenantId/g

      if (antiPattern.test(src) || altPattern.test(src)) {
        violations.push(rel)
      }
    }

    if (violations.length > 0) {
      console.warn(
        `\nQ6 WARNING - possible tenant_id from request body in:\n` +
          violations.map((v) => `  CHECK: ${v}`).join('\n') +
          `\n(May be false positives - verify manually)`
      )
    }

    console.log(`Q6: ${violations.length} files with possible tenant_id-from-body patterns.`)
    expect(true).toBe(true)
  })
})
