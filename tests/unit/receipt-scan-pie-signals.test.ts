import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('receipt import accepts optional store location for PIE regional learning', () => {
  const source = read('lib/ingredients/receipt-scan-actions.ts')

  assert.match(source, /storeState\?: string \| null/)
  assert.match(source, /storeZip\?: string \| null/)
  assert.match(source, /storeState: params\.storeState \?\? null/)
  assert.match(source, /storeZip: params\.storeZip \?\? null/)
})

test('receipt bridge only feeds anonymized regional aggregates when state is known', () => {
  const source = read('lib/pricing/receipt-price-bridge.ts')

  assert.match(source, /if \(!signal\.storeState\) continue/)
  assert.match(source, /pie_regional_observations/)
  assert.match(source, /tenantId: string/)
})
