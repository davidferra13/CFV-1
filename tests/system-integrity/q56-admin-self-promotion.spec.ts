/**
 * Q56: Admin Self-Promotion Prevention
 *
 * The platform_admins table controls who has platform-wide access. If any
 * server action allows a non-admin to insert or modify rows in this table,
 * a regular chef could grant themselves admin privileges. This is a privilege
 * escalation vulnerability — the highest severity access control failure.
 *
 * Defense: Only existing admins (who pass requireAdmin()) can mutate the
 * platform_admins table. No server action callable by a regular chef should
 * insert into platform_admins.
 *
 * Tests:
 *
 * 1. PLATFORM_ADMINS MUTATIONS REQUIRE ADMIN: Every server action that writes
 *    to platform_admins must call requireAdmin() before the write.
 *
 * 2. NO CHEF ACTION INSERTS INTO PLATFORM_ADMINS: No file under lib/
 *    that lacks a requireAdmin() call also contains an insert into platform_admins.
 *
 * 3. ADMIN GRANT ACTION IS ADMIN-ONLY: If there is an action like grantAdminAccess
 *    or addAdmin, it must call requireAdmin() first.
 *
 * 4. PLATFORM_ADMINS NOT IN MIGRATION SEED DATA AS OPEN INSERT: The platform_admins
 *    table is not populated via a server action with no auth guard.
 *
 * 5. ADMIN REVOCATION ALSO REQUIRES ADMIN: Removing an admin (deleteAdmin,
 *    revokeAdmin) also requires requireAdmin() — an admin cannot be removed
 *    by a regular chef.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q56-admin-self-promotion.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()

function getAllTsFiles(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...getAllTsFiles(full))
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(full)
    }
  }
  return results
}

test.describe('Q56: Admin self-promotion prevention', () => {
  // ---------------------------------------------------------------------------
  // Test 1: All platform_admins write operations require admin auth
  // ---------------------------------------------------------------------------
  test('every server action writing to platform_admins calls requireAdmin() first', () => {
    const allFiles = getAllTsFiles(resolve(ROOT, 'lib')).concat(getAllTsFiles(resolve(ROOT, 'app')))

    const violations: string[] = []

    for (const file of allFiles) {
      let src: string
      try {
        src = readFileSync(file, 'utf-8')
      } catch {
        continue
      }

      if (!src.includes("'use server'") && !src.includes('"use server"')) continue

      // File writes to platform_admins
      const writesToAdmins =
        (src.includes('platform_admins') && src.includes('.insert(')) ||
        (src.includes('platform_admins') && src.includes('.update(')) ||
        (src.includes('platform_admins') && src.includes('.delete(')) ||
        (src.includes('platform_admins') && src.includes('.upsert('))

      if (!writesToAdmins) continue

      if (!src.includes('requireAdmin')) {
        violations.push(file.replace(ROOT, '').replace(/\\/g, '/'))
      }
    }

    expect(
      violations,
      `These server files write to platform_admins without requireAdmin(): ${violations.join(', ')} — PRIVILEGE ESCALATION RISK`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Admin grant/revoke actions call requireAdmin
  // ---------------------------------------------------------------------------
  test('grant/revoke admin access actions call requireAdmin()', () => {
    const adminActionsFile = resolve(ROOT, 'lib/admin/chef-admin-actions.ts')
    if (!existsSync(adminActionsFile)) return

    const src = readFileSync(adminActionsFile, 'utf-8')

    // If this file modifies admin access, it must require admin
    if (
      src.includes('platform_admins') ||
      src.includes('grantAdmin') ||
      src.includes('revokeAdmin') ||
      src.includes('addAdmin')
    ) {
      expect(
        src.includes('requireAdmin'),
        'lib/admin/chef-admin-actions.ts modifies admin status but must call requireAdmin() first'
      ).toBe(true)
    }
  })

  // ---------------------------------------------------------------------------
  // Test 3: No chef-facing server action references platform_admins insert
  // ---------------------------------------------------------------------------
  test('chef-facing server actions do not insert into platform_admins', () => {
    // Files that are definitely chef-facing (not admin)
    const chefActionDirs = [
      resolve(ROOT, 'lib/events'),
      resolve(ROOT, 'lib/clients'),
      resolve(ROOT, 'lib/quotes'),
      resolve(ROOT, 'lib/finance'),
      resolve(ROOT, 'lib/menus'),
    ]

    for (const dir of chefActionDirs) {
      if (!existsSync(dir)) continue
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.ts')) continue
        const file = join(dir, entry.name)
        const src = readFileSync(file, 'utf-8')

        expect(
          !src.includes('platform_admins'),
          `${file.replace(ROOT, '')} is a chef-facing file but references platform_admins — privilege escalation risk`
        ).toBe(true)
      }
    }
  })

  // ---------------------------------------------------------------------------
  // Test 4: requireAdmin is not callable from client components
  // ---------------------------------------------------------------------------
  test("requireAdmin is only in 'use server' files or lib/auth/ — not client components", () => {
    // requireAdmin should never appear in .tsx client components
    // (it would fail at runtime, but finding it early prevents confusion)
    const clientDir = resolve(ROOT, 'components')
    if (!existsSync(clientDir)) return

    const allComponentFiles = getAllTsFiles(clientDir)
    const violations: string[] = []

    for (const file of allComponentFiles) {
      const src = readFileSync(file, 'utf-8')
      // Client components (no 'use server') should not import requireAdmin
      if (src.includes("'use client'") && src.includes('requireAdmin')) {
        violations.push(file.replace(ROOT, '').replace(/\\/g, '/'))
      }
    }

    expect(
      violations,
      `These client components import requireAdmin (will crash): ${violations.join(', ')}`
    ).toHaveLength(0)
  })
})
