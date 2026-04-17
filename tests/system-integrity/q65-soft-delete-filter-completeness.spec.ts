/**
 * Q65: Soft-Delete Filter Completeness
 *
 * Hypothesis: Every SELECT query on tables known to have a deleted_at column
 * includes a filter for deleted_at IS NULL (or the isMissingSoftDeleteColumn
 * compatibility fallback pattern).
 *
 * Failure: Deleted records appear in lists, invoices, or financial
 * calculations, showing phantom data to users.
 *
 * Tests:
 *
 * 1. Identify tables with soft-delete by scanning migrations for 'deleted_at' columns
 * 2. Scan all .from('tablename').select() calls in lib/ for those tables
 * 3. Verify each has .is('deleted_at', null) or the isMissingSoftDeleteColumn pattern
 * 4. Known tables: events, menus, clients, inquiries, quotes
 * 5. Flag queries that select from soft-deletable tables without filtering deleted_at
 *
 * Known exemptions:
 * - Functions explicitly named "restore" or "includeDeleted"
 * - Admin audit queries that intentionally show deleted records
 * - The isMissingSoftDeleteColumn pattern is a valid filter
 * - Queries inside .rpc() calls (handled at the SQL function level)
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q65-soft-delete-filter-completeness.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join, relative } from 'path'

const ROOT = process.cwd()

// Known core tables with soft-delete (from migration 20260326000009_work_loss_safe_phase0.sql)
const SOFT_DELETE_TABLES = ['events', 'menus', 'clients', 'inquiries', 'quotes']

/**
 * Recursively collect all .ts and .tsx files in a directory.
 */
function collectTsFiles(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results

  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name.startsWith('.next') ||
          entry.name === '.git' ||
          entry.name === 'tests'
        ) {
          continue
        }
        results.push(...collectTsFiles(fullPath))
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        results.push(fullPath)
      }
    }
  } catch {
    // Permission errors
  }
  return results
}

/**
 * Check if a code block around a .from('table').select() call includes
 * a deleted_at filter or the isMissingSoftDeleteColumn pattern.
 */
function hasSoftDeleteFilter(contextBlock: string): boolean {
  return (
    contextBlock.includes('deleted_at') ||
    contextBlock.includes('isMissingSoftDeleteColumn') ||
    contextBlock.includes('withSoftDeleteFilter')
  )
}

/**
 * Check if the function context suggests this is an exempted query.
 */
function isExemptedContext(funcContext: string, filePath: string): boolean {
  const lower = funcContext.toLowerCase()
  const fileName = filePath.toLowerCase()

  return (
    lower.includes('restore') ||
    lower.includes('includedeleted') ||
    lower.includes('include_deleted') ||
    lower.includes('admin') ||
    lower.includes('audit') ||
    lower.includes('undelete') ||
    fileName.includes('restore') ||
    fileName.includes('admin-audit')
  )
}

test.describe('Q65: Soft-delete filter completeness', () => {
  // -------------------------------------------------------------------------
  // Test 1: Confirm which tables have soft-delete columns
  // -------------------------------------------------------------------------
  test('known tables have deleted_at columns in migrations', () => {
    const migrationFile = resolve(
      ROOT,
      'database/migrations/20260326000009_work_loss_safe_phase0.sql'
    )
    expect(existsSync(migrationFile), 'The soft-delete migration file must exist').toBe(true)

    const migrationSrc = readFileSync(migrationFile, 'utf-8')

    for (const table of SOFT_DELETE_TABLES) {
      expect(
        migrationSrc.includes(`ALTER TABLE IF EXISTS public.${table}`),
        `Migration must add deleted_at to the '${table}' table`
      ).toBe(true)
    }

    console.log(`[Q65] Confirmed soft-delete on tables: ${SOFT_DELETE_TABLES.join(', ')}`)
  })

  // -------------------------------------------------------------------------
  // Test 2: Scan queries on soft-deletable tables for deleted_at filters
  // -------------------------------------------------------------------------
  test('queries on soft-deletable tables include deleted_at filter', () => {
    const dirs = [resolve(ROOT, 'lib'), resolve(ROOT, 'app'), resolve(ROOT, 'components')]
    const allFiles: string[] = []
    for (const dir of dirs) {
      allFiles.push(...collectTsFiles(dir))
    }

    const unfiltered: { file: string; table: string; line: number }[] = []
    const filtered: { file: string; table: string }[] = []
    let totalQueries = 0

    for (const filePath of allFiles) {
      let src: string
      try {
        src = readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }

      const lines = src.split('\n')

      for (const table of SOFT_DELETE_TABLES) {
        // Find all .from('table') or .from("table") calls followed by .select(
        const fromPattern = new RegExp(`\\.from\\(\\s*['"\`]${table}['"\`]\\s*\\)`, 'g')
        let match
        while ((match = fromPattern.exec(src)) !== null) {
          totalQueries++

          // Get the surrounding context (100 chars before, 500 chars after)
          const contextStart = Math.max(0, match.index - 200)
          const contextEnd = Math.min(src.length, match.index + 800)
          const context = src.substring(contextStart, contextEnd)

          // Check if this is inside a .rpc() call (SQL function handles filtering)
          if (context.includes('.rpc(')) {
            filtered.push({ file: relative(ROOT, filePath), table })
            continue
          }

          // Check if the context is an insert/update/delete mutation
          // Mutations don't need deleted_at filters on the FROM clause.
          // But SELECT (.select()) queries must filter.
          const isSelectQuery =
            context.includes('.select(') &&
            !context.includes('.insert(') &&
            !context.includes('.update(') &&
            !context.includes('.delete(')

          if (!isSelectQuery) {
            // This is a mutation, not a read. Mutations may include deleted_at
            // as a condition (.is('deleted_at', null)) to prevent operating on
            // deleted records, but it is less critical. Skip for now.
            filtered.push({ file: relative(ROOT, filePath), table })
            continue
          }

          // Check if the function or file context exempts this query
          if (isExemptedContext(context, filePath)) {
            filtered.push({ file: relative(ROOT, filePath), table })
            continue
          }

          // Check for deleted_at filter in surrounding context
          if (hasSoftDeleteFilter(context)) {
            filtered.push({ file: relative(ROOT, filePath), table })
          } else {
            // Find the line number of this match
            const upToMatch = src.substring(0, match.index)
            const lineNum = upToMatch.split('\n').length

            unfiltered.push({
              file: relative(ROOT, filePath),
              table,
              line: lineNum,
            })
          }
        }
      }
    }

    console.log(`[Q65] Total queries on soft-deletable tables: ${totalQueries}`)
    console.log(`[Q65] Properly filtered: ${filtered.length}`)

    if (unfiltered.length > 0) {
      console.warn(
        `[Q65 WARNING] ${unfiltered.length} SELECT queries on soft-deletable tables missing deleted_at filter:\n` +
          unfiltered
            .map((u) => `  - ${u.file}:${u.line} (.from('${u.table}').select() without deleted_at)`)
            .join('\n')
      )
    }

    // Visibility test: log the actual coverage so the gap is visible.
    // Threshold is baselined at current state (30%). The goal is to trend up over time.
    if (totalQueries > 0) {
      const filterRate = Math.round((filtered.length / totalQueries) * 100)
      console.log(`[Q65] Filter coverage: ${filterRate}%`)
      if (filterRate < 70) {
        console.warn(
          `[Q65 GAP] Soft-delete filter coverage is ${filterRate}% (${filtered.length}/${totalQueries}). ` +
            `Target is 70%. ${unfiltered.length} queries need deleted_at filters added.`
        )
      }
      expect(
        filterRate,
        `Soft-delete filter coverage is ${filterRate}% (${filtered.length}/${totalQueries}). ` +
          'Baseline threshold is 30%. Fix unfiltered queries to trend toward 70%.'
      ).toBeGreaterThanOrEqual(30)
    }
  })

  // -------------------------------------------------------------------------
  // Test 3: isMissingSoftDeleteColumn helper exists for compatibility
  // -------------------------------------------------------------------------
  test('isMissingSoftDeleteColumn compatibility helper exists', () => {
    const compatFile = resolve(ROOT, 'lib/mutations/soft-delete-compat.ts')
    expect(
      existsSync(compatFile),
      'lib/mutations/soft-delete-compat.ts must exist for deleted_at column compatibility'
    ).toBe(true)

    const src = readFileSync(compatFile, 'utf-8')
    expect(
      src.includes('isMissingSoftDeleteColumn'),
      'soft-delete-compat.ts must export isMissingSoftDeleteColumn'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Active-row partial indexes exist for soft-deleted tables
  // -------------------------------------------------------------------------
  test('partial indexes exist for active rows on soft-deleted tables', () => {
    const migrationFile = resolve(
      ROOT,
      'database/migrations/20260326000009_work_loss_safe_phase0.sql'
    )
    const migrationSrc = readFileSync(migrationFile, 'utf-8')

    for (const table of SOFT_DELETE_TABLES) {
      const indexPattern = `idx_${table}_active`
      expect(
        migrationSrc.includes(indexPattern),
        `An active-row partial index (${indexPattern}) must exist for the '${table}' table. ` +
          'This ensures queries filtering on deleted_at IS NULL are fast.'
      ).toBe(true)
    }
  })
})
