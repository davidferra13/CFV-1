import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('homepage keeps the operator proof path above the consumer marketplace branch', () => {
  const home = read('app/(public)/page.tsx')

  assert.match(
    home,
    /Run private chef, catering, and meal prep work without spreadsheet patchwork\./
  )
  assert.match(home, /sourceCta: 'hero_operator_proof'/)
  assert.match(home, /See operator proof/)
  assert.match(home, /Request an operator walkthrough/)
  assert.doesNotMatch(home, /Browse live chefs, then book the one that fits your table\./)
})

test('operator proof page makes the walkthrough the default qualified next step', () => {
  const forOperators = read('app/(public)/for-operators/page.tsx')

  assert.match(forOperators, /sourceCta: 'hero_walkthrough_primary'/)
  assert.match(forOperators, /The default next step is the walkthrough once the proof is close\./)
  assert.match(
    forOperators,
    /Need a more specific frame than the default proof-to-walkthrough path\?/
  )
})
