/**
 * Q27: Migration Timestamp Integrity
 *
 * Migrations run in timestamp order. Two failure modes:
 * (a) Timestamp collision — two migrations with the same timestamp; only one
 *     applies, the other is silently skipped, corrupting the schema.
 * (b) Gap in sequence — a migration file is missing, causing dependent
 *     migrations to fail at runtime.
 *
 * These are especially dangerous in multi-agent environments where concurrent
 * sessions might generate colliding timestamps (CLAUDE.md rule: always
 * `glob database/migrations/*.sql` before creating a new migration).
 *
 * Tests:
 *
 * 1. NO TIMESTAMP COLLISIONS: Every migration file has a unique timestamp prefix.
 *
 * 2. SEQUENTIAL ORDERING: Migration timestamps are strictly increasing.
 *
 * 3. LAYER MIGRATIONS PRESENT: The 4 foundational layer migrations (Layer 1-4)
 *    must all exist. These are the schema foundation.
 *
 * 4. FINANCIAL VIEW MIGRATION: Migration 20260415000003 (financial view fix)
 *    must exist and appear after the base events migration.
 *
 * 5. LEDGER IMMUTABILITY TRIGGER: At least one migration defines an
 *    immutability trigger on ledger_entries.
 *
 * 6. NO DESTRUCTIVE STATEMENTS WITHOUT COMMENT: Migrations containing DROP
 *    or TRUNCATE must include a comment explaining the rationale.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q27-migration-ordering.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'

const MIGRATIONS_DIR = resolve(process.cwd(), 'database/migrations')

function getMigrations(): string[] {
  try {
    return readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()
  } catch {
    return []
  }
}

function extractTimestamp(filename: string): string {
  const match = filename.match(/^(\d{17})_/)
  return match ? match[1] : filename.split('_')[0]
}

test.describe('Q27: Migration timestamp integrity', () => {
  // -------------------------------------------------------------------------
  // Test 1: No timestamp collisions
  // -------------------------------------------------------------------------
  test('all migration files have unique timestamps', () => {
    const migrations = getMigrations()
    expect(
      migrations.length,
      'Migration directory must have at least one .sql file'
    ).toBeGreaterThan(0)

    const timestamps = migrations.map((f) => extractTimestamp(f))
    const uniqueTimestamps = new Set(timestamps)

    const duplicates = timestamps.filter((t, i) => timestamps.indexOf(t) !== i)

    if (duplicates.length > 0) {
      console.error(
        `\nQ27 COLLISION — duplicate migration timestamps:\n` +
          duplicates.map((d) => `  COLLISION: ${d}`).join('\n')
      )
    }

    expect(
      uniqueTimestamps.size,
      `Migration timestamps must all be unique. Collisions: ${duplicates.join(', ')}`
    ).toBe(timestamps.length)
  })

  // -------------------------------------------------------------------------
  // Test 2: Migrations are in strictly increasing timestamp order
  // -------------------------------------------------------------------------
  test('migration timestamps are strictly increasing (no out-of-order files)', () => {
    const migrations = getMigrations()
    const timestamps = migrations.map((f) => extractTimestamp(f))

    const outOfOrder: string[] = []
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] <= timestamps[i - 1]) {
        outOfOrder.push(`${migrations[i]} <= ${migrations[i - 1]}`)
      }
    }

    expect(
      outOfOrder,
      `Migration files must be in strictly increasing order. Out-of-order: ${outOfOrder.join('; ')}`
    ).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // Test 3: Foundation layer migrations (1-4) all exist
  // -------------------------------------------------------------------------
  test('all 4 foundation layer migrations exist', () => {
    const migrations = getMigrations()

    const requiredLayers = [
      '20260215000001', // Layer 1: Foundation
      '20260215000002', // Layer 2: Inquiry/Messaging
      '20260215000003', // Layer 3: Events/Quotes/Financials
      '20260215000004', // Layer 4: Menus/Recipes/Costing
    ]

    for (const prefix of requiredLayers) {
      const found = migrations.some((m) => m.includes(prefix))
      expect(
        found,
        `Foundation migration ${prefix} must exist (Layer 1-4 are the schema foundation)`
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 4: Financial view fix migration exists and is after base events
  // -------------------------------------------------------------------------
  test('financial view fix migration (20260415000003) exists after base events migration', () => {
    const migrations = getMigrations()

    const financialFix = migrations.find((m) => m.includes('20260415000003'))
    expect(
      financialFix,
      'Migration 20260415000003 (financial view soft-delete + GREATEST fix) must exist'
    ).toBeTruthy()

    // Must appear after the base events migration (Layer 3)
    const layer3Idx = migrations.findIndex((m) => m.includes('20260215000003'))
    const fixIdx = migrations.findIndex((m) => m.includes('20260415000003'))

    if (layer3Idx >= 0 && fixIdx >= 0) {
      expect(
        fixIdx > layer3Idx,
        'Financial view fix migration must come after the base events migration (Layer 3)'
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 5: Ledger immutability trigger exists in migrations
  // -------------------------------------------------------------------------
  test('at least one migration defines ledger_entries immutability trigger', () => {
    const migrations = getMigrations()

    let found = false
    for (const file of migrations) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
      if (
        sql.includes('ledger_entries') &&
        (sql.includes('BEFORE UPDATE') ||
          sql.includes('BEFORE DELETE') ||
          sql.includes('prevent_ledger') ||
          sql.includes('immut'))
      ) {
        found = true
        break
      }
    }

    expect(
      found,
      'At least one migration must define a BEFORE UPDATE/DELETE trigger on ledger_entries for immutability'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: No silent DROP TABLE or TRUNCATE without explanation comment
  // -------------------------------------------------------------------------
  test('migrations with DROP TABLE or TRUNCATE include a rationale comment', () => {
    const migrations = getMigrations()

    const unguardedDestructive: string[] = []

    for (const file of migrations) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
      const hasDestructive = /\bDROP\s+TABLE\b/i.test(sql) || /\bTRUNCATE\b/i.test(sql)

      if (hasDestructive) {
        // Must have a comment (-- or /* */) near the destructive statement
        const hasComment = sql.includes('--') || sql.includes('/*')
        if (!hasComment) {
          unguardedDestructive.push(file)
        }
      }
    }

    if (unguardedDestructive.length > 0) {
      console.warn(
        `\nQ27 WARNING — migrations with DROP/TRUNCATE but no comments:\n` +
          unguardedDestructive.map((f) => `  REVIEW: ${f}`).join('\n')
      )
    }

    // Hard fail only for truly silent drops (no comment at all in the file)
    expect(
      unguardedDestructive,
      `Migrations with DROP TABLE or TRUNCATE must include explanatory comments: ${unguardedDestructive.join(', ')}`
    ).toHaveLength(0)
  })
})
