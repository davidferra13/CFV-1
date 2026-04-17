/**
 * Q97: Migration Timestamp Uniqueness (Q56)
 *
 * Duplicate migration timestamps = undefined execution order = schema corruption.
 * Multi-agent sessions generate collisions without this check.
 *
 * What we check:
 *   1. All migration timestamps are strictly unique
 *   2. Timestamps are in ascending order
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q97-migration-timestamp-uniqueness.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readdirSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()

test.describe('Q97: Migration timestamp uniqueness', () => {
  const migrationsDir = resolve(ROOT, 'database/migrations')

  test('no duplicate migration timestamps', () => {
    let files: string[]
    try {
      files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()
    } catch {
      test.skip()
      return
    }

    const timestamps = files
      .map((f) => {
        const match = f.match(/^(\d+)_/)
        return match ? { timestamp: match[1], file: f } : null
      })
      .filter(Boolean) as { timestamp: string; file: string }[]

    // Check for duplicates
    const seen = new Map<string, string[]>()
    for (const { timestamp, file } of timestamps) {
      const existing = seen.get(timestamp) || []
      existing.push(file)
      seen.set(timestamp, existing)
    }

    const duplicates = Array.from(seen.entries())
      .filter(([_, files]) => files.length > 1)
      .map(([ts, files]) => `  ${ts}: ${files.join(', ')}`)

    if (duplicates.length > 0) {
      console.warn(
        `Duplicate migration timestamps found:\n${duplicates.join('\n')}\n` +
          'Fix: Rename one file in each pair to a unique timestamp.'
      )
    }

    expect(duplicates.length, `${duplicates.length} duplicate migration timestamp(s) found`).toBe(0)
  })

  test('migration timestamps are in ascending order', () => {
    let files: string[]
    try {
      files = readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()
    } catch {
      test.skip()
      return
    }

    const timestamps = files
      .map((f) => {
        const match = f.match(/^(\d+)_/)
        return match ? match[1] : null
      })
      .filter(Boolean) as string[]

    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] < timestamps[i - 1]) {
        expect
          .soft(
            timestamps[i],
            `Migration ${i} timestamp ${timestamps[i]} is out of order (previous: ${timestamps[i - 1]})`
          )
          .toBeGreaterThanOrEqual(timestamps[i - 1])
      }
    }
  })
})
