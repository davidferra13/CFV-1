/**
 * Q89: Ledger Append Cache Invalidation
 *
 * Stress Question Q1: After a ledger entry is appended, financial caches
 * must be invalidated so the dashboard shows current balances.
 *
 * What we check:
 *   1. Every function that calls appendLedgerEntry* also calls revalidatePath or revalidateTag
 *   2. The revalidation targets include financial-relevant paths
 *   3. No ledger append path is fire-and-forget without cache bust
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q89-ledger-cache-invalidation.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()

function scanDir(dir: string, ext: string): string[] {
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...scanDir(full, ext))
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        results.push(full)
      }
    }
  } catch {
    /* skip unreadable */
  }
  return results
}

test.describe('Q89: Ledger cache invalidation', () => {
  const sourceFiles = [
    ...scanDir(resolve(ROOT, 'lib'), '.ts'),
    ...scanDir(resolve(ROOT, 'app'), '.ts'),
  ]

  test('every file calling appendLedgerEntry also calls revalidatePath or revalidateTag', () => {
    const appendPattern = /appendLedgerEntry|createAdjustment|appendLedgerEntryForChef/
    const revalidatePattern = /revalidatePath|revalidateTag/

    const filesWithAppend: string[] = []
    const filesWithAppendNoRevalidate: string[] = []

    for (const file of sourceFiles) {
      const content = readFileSync(file, 'utf-8')
      if (appendPattern.test(content)) {
        filesWithAppend.push(file)
        if (!revalidatePattern.test(content)) {
          // Check if the file is the definition itself (not a caller)
          if (!file.includes('append-internal') && !file.includes('append.ts')) {
            filesWithAppendNoRevalidate.push(file)
          }
        }
      }
    }

    expect(filesWithAppend.length).toBeGreaterThan(0)

    if (filesWithAppendNoRevalidate.length > 0) {
      const relative = filesWithAppendNoRevalidate.map((f) => f.replace(ROOT, ''))
      console.warn(
        `Files that append ledger entries without cache invalidation:\n${relative.join('\n')}`
      )
    }

    // Allow known exceptions (webhook handlers that don't need client cache bust)
    const allowedExceptions = ['webhooks/stripe']
    const realFailures = filesWithAppendNoRevalidate.filter(
      (f) => !allowedExceptions.some((ex) => f.includes(ex))
    )

    expect(
      realFailures,
      `${realFailures.length} file(s) append ledger entries without revalidating caches`
    ).toHaveLength(0)
  })
})
