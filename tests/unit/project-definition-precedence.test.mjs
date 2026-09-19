import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')

test('canonical project definition owns identity and scope conflicts', () => {
  const canonical = read('docs/project-definition-and-scope.md')

  assert.match(canonical, /Status: canonical source of truth/)
  assert.match(canonical, /If another document conflicts with this one on project identity, audience, scope, or monetization posture, this document wins/)
  assert.match(canonical, /The primary product is the authenticated operator workspace/)
})

test('consumer-first vision is fenced to the public discovery surface', () => {
  const vision = read('docs/consumer-first-vision.md')

  assert.match(vision, /supporting-surface strategy, not canonical product identity/)
  assert.match(vision, /Canonical authority.*docs\/project-definition-and-scope\.md/)
  assert.match(vision, /PRIMARY experience \*\*within public discovery\*\*/)
  assert.doesNotMatch(vision, /ChefFlow is a \*\*food discovery platform\*\*/)
  assert.doesNotMatch(vision, /^The consumer journey is the PRIMARY experience\./m)
  assert.doesNotMatch(vision, /^5\. \*\*Operator sign-up is secondary\.\*\*/m)
})

test('decision ledger defers identity conflicts to canonical scope', () => {
  const ledger = read('docs/specs/chef-flow-decision-ledger-v1.md')

  assert.match(ledger, /project identity, audience, scope, and monetization posture/)
  assert.match(ledger, /docs\/project-definition-and-scope\.md.*canonical source of truth/)
  assert.match(ledger, /global product identity is no longer open/)
})
