import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('inviting homepage connects discovery and planning while retaining the operator path', () => {
  const home = read('app/(public)/page.tsx')
  assert.match(home, /<Link href="\/eat" className={styles.primary}>/)
  for (const destination of ['/eat', '/hub', '/find']) {
    assert.ok(home.includes("href: '" + destination + "'"), destination + ' must remain reachable')
    assert.ok(read('app/(public)' + destination + '/page.tsx').length > 0)
  }
  assert.match(home, /<Link href="\/for-operators"/)
  assert.ok(read('app/(public)/for-operators/page.tsx').length > 0)
  assert.doesNotMatch(home, /sourceCta: 'hero_operator_proof'/)
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
