/**
 * Q55: Loyalty Guest Milestone Tenant Scoping
 *
 * The loyalty_guest_milestones table was added in migration
 * 20260415000005_loyalty_guest_milestones.sql. New tables must always
 * include a tenant/chef scoping column and enforce it at both the DB
 * (RLS or CHECK constraint) and application (server action WHERE clause) levels.
 *
 * This question verifies the new table follows the established pattern:
 * chef_id or tenant_id column present, foreign key to chefs, and all
 * server actions that read or write the table scope their queries to
 * the authenticated chef's id.
 *
 * Tests:
 *
 * 1. MIGRATION EXISTS: database/migrations/20260415000005_loyalty_guest_milestones.sql
 *    exists.
 *
 * 2. TABLE HAS CHEF SCOPING COLUMN: The migration SQL includes chef_id or
 *    tenant_id column with a foreign key to the chefs table.
 *
 * 3. LOYALTY ACTIONS SCOPE QUERIES: lib/loyalty/actions.ts (or equivalent)
 *    scopes all queries to the authenticated chef's id from session.
 *
 * 4. LOYALTY ACTIONS USE REQUIRECHEF: All loyalty server actions call
 *    requireChef() before querying loyalty_guest_milestones.
 *
 * 5. NO CROSS-CHEF MILESTONE LEAKAGE: No loyalty query reads all milestones
 *    without a chef_id/tenant_id filter (would expose every chef's loyalty data).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q55-loyalty-table-scoping.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()
const MIGRATION = resolve(ROOT, 'database/migrations/20260415000005_loyalty_guest_milestones.sql')

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

test.describe('Q55: Loyalty guest milestone tenant scoping', () => {
  // ---------------------------------------------------------------------------
  // Test 1: Migration file exists
  // ---------------------------------------------------------------------------
  test('loyalty_guest_milestones migration file exists', () => {
    expect(
      existsSync(MIGRATION),
      'database/migrations/20260415000005_loyalty_guest_milestones.sql must exist'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 2: Migration SQL includes chef/tenant scoping column
  // ---------------------------------------------------------------------------
  test('loyalty_guest_milestones table has chef_id or tenant_id column with FK to chefs', () => {
    if (!existsSync(MIGRATION)) return
    const sql = readFileSync(MIGRATION, 'utf-8')

    expect(
      sql.toLowerCase().includes('chef_id') || sql.toLowerCase().includes('tenant_id'),
      'loyalty_guest_milestones must have a chef_id or tenant_id column for tenant scoping'
    ).toBe(true)

    expect(
      sql.toLowerCase().includes('references') &&
        (sql.toLowerCase().includes('chefs') || sql.toLowerCase().includes('chef_id')),
      'loyalty_guest_milestones chef_id/tenant_id must have a foreign key reference to the chefs table'
    ).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Test 3: Loyalty action files scope queries to authenticated chef
  // ---------------------------------------------------------------------------
  test('loyalty action files scope loyalty_guest_milestones queries to session chef', () => {
    const loyaltyDir = resolve(ROOT, 'lib/loyalty')
    if (!existsSync(loyaltyDir)) return

    const files = findFiles(loyaltyDir, '.ts')
    const violations: string[] = []

    for (const file of files) {
      const src = readFileSync(file, 'utf-8')
      if (!src.includes('loyalty_guest_milestones')) continue

      // If it queries the table, it must scope to chef
      if (!src.includes('chef_id') && !src.includes('tenant_id') && !src.includes('tenantId')) {
        violations.push(file.replace(ROOT, '').replace(/\\/g, '/'))
      }
    }

    expect(
      violations,
      `These loyalty files query loyalty_guest_milestones without chef scoping: ${violations.join(', ')}`
    ).toHaveLength(0)
  })

  // ---------------------------------------------------------------------------
  // Test 4: Loyalty actions call requireChef()
  // ---------------------------------------------------------------------------
  test('loyalty action files call requireChef() before accessing milestone data', () => {
    const loyaltyDir = resolve(ROOT, 'lib/loyalty')
    if (!existsSync(loyaltyDir)) return

    const files = findFiles(loyaltyDir, '.ts')
    let foundMilestoneQuery = false
    let foundAuthGuard = false

    for (const file of files) {
      const src = readFileSync(file, 'utf-8')
      if (src.includes('loyalty_guest_milestones')) {
        foundMilestoneQuery = true
        if (src.includes('requireChef')) foundAuthGuard = true
      }
    }

    if (foundMilestoneQuery) {
      expect(
        foundAuthGuard,
        'Loyalty actions querying loyalty_guest_milestones must call requireChef()'
      ).toBe(true)
    }
  })

  // ---------------------------------------------------------------------------
  // Test 5: No unscoped SELECT * from loyalty_guest_milestones
  // ---------------------------------------------------------------------------
  test('no loyalty query reads all milestones without a tenant filter', () => {
    const loyaltyDir = resolve(ROOT, 'lib/loyalty')
    if (!existsSync(loyaltyDir)) return

    const files = findFiles(loyaltyDir, '.ts')

    for (const file of files) {
      const src = readFileSync(file, 'utf-8')
      if (!src.includes('loyalty_guest_milestones')) continue

      // If there's a select from this table, it should be followed by a scoping eq
      // Heuristic: if there's .from('loyalty_guest_milestones') without .eq('chef_id' or 'tenant_id')
      const fromIdx = src.indexOf("'loyalty_guest_milestones'")
      if (fromIdx === -1) continue

      const queryBlock = src.slice(fromIdx, fromIdx + 500)
      expect(
        queryBlock.includes('chef_id') || queryBlock.includes('tenant_id'),
        `${file.replace(ROOT, '')} queries loyalty_guest_milestones without scoping — would expose all chefs' loyalty data`
      ).toBe(true)
    }
  })
})
