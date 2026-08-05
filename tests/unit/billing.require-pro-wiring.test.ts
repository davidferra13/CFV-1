/**
 * Source contract for lib/billing/require-pro.ts.
 *
 * Guards against the P0-1 regression class: requirePro silently reverting
 * to a no-op that returns requireChef() and ignores its slug.
 *
 * Run: node --test --import tsx tests/unit/billing.require-pro-wiring.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(path.resolve(__dirname, '../../lib/billing/require-pro.ts'), 'utf-8')

describe('requirePro wiring', () => {
  it('consults the feature-gate layer', () => {
    assert.ok(source.includes('checkGate'), 'requirePro must call checkGate')
    assert.ok(
      source.includes('BILLING_SLUG_GATES'),
      'requirePro must resolve slugs through BILLING_SLUG_GATES'
    )
  })

  it('no longer ignores its slug', () => {
    assert.ok(!source.includes('_featureSlug'), 'the slug parameter must be used, not discarded')
  })

  it('redirects denied chefs to plan settings instead of rendering the feature', () => {
    assert.ok(source.includes('redirect('), 'denial path must redirect')
    assert.ok(source.includes('/settings/billing'), 'denial redirect must land on plan settings')
  })
})
