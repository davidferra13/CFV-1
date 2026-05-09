import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const syncSource = readFileSync(join(process.cwd(), 'lib/openclaw/sync.ts'), 'utf8')

test('OpenClaw sync writes normalized unit prices to ingredient snapshots', () => {
  assert.match(
    syncSource,
    /last_price_cents\s*=\s*\$\{bestPrice\.normalized_cents\}/,
    'SQL ingredient snapshot update must use bestPrice.normalized_cents'
  )
  assert.match(
    syncSource,
    /lastPriceCents:\s*bestPrice\.normalized_cents/,
    'Drizzle fallback snapshot update must use bestPrice.normalized_cents'
  )
  assert.match(
    syncSource,
    /ing\.lastPriceCents\s*===\s*bestPrice\.normalized_cents/,
    'dedup check must compare against the normalized unit price'
  )
  assert.doesNotMatch(
    syncSource,
    /last_price_cents\s*=\s*\$\{bestPrice\.cents\}/,
    'raw package cents must not be written as the ingredient unit-price snapshot'
  )
  assert.doesNotMatch(
    syncSource,
    /lastPriceCents:\s*bestPrice\.cents/,
    'raw package cents must not be written by the Drizzle fallback'
  )
})
