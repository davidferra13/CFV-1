/**
 * Unit tests for the billing slug to gate key map.
 *
 * Every requirePro('<slug>') literal in lib/ and app/ must resolve to a
 * gate that exists in GATE_REGISTRY, or enforcement silently fails closed
 * on a page that used to work.
 *
 * Run: node --test --import tsx tests/unit/feature-gates.billing-slug-map.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { BILLING_SLUG_GATES } from '../../lib/feature-gates/billing-slug-map'
import { GATE_REGISTRY } from '../../lib/feature-gates/gate-registry'

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

function collectRequireProSlugs(): Set<string> {
  const roots = ['lib', 'app']
  const slugs = new Set<string>()
  const pattern = /requirePro\((['"])([^'"]+)\1\)/g
  for (const root of roots) {
    for (const file of walk(path.resolve(__dirname, '../../', root))) {
      const content = fs.readFileSync(file, 'utf-8')
      let match: RegExpExecArray | null
      while ((match = pattern.exec(content)) !== null) {
        slugs.add(match[2])
      }
    }
  }
  return slugs
}

describe('billing slug map', () => {
  it('maps every gate key it declares to a real GATE_REGISTRY entry', () => {
    for (const [slug, gateKey] of Object.entries(BILLING_SLUG_GATES)) {
      assert.ok(
        gateKey in GATE_REGISTRY,
        `slug '${slug}' maps to '${gateKey}' which is missing from GATE_REGISTRY`
      )
    }
  })

  it('covers every requirePro slug literal found in lib/ and app/', () => {
    const found = collectRequireProSlugs()
    assert.ok(found.size >= 15, `expected at least 15 slugs in source, found ${found.size}`)
    for (const slug of found) {
      assert.ok(
        slug in BILLING_SLUG_GATES,
        `requirePro('${slug}') exists in source but has no entry in BILLING_SLUG_GATES`
      )
    }
  })

  it('covers the UpgradeGate slugs (integrations, raffle)', () => {
    assert.ok('integrations' in BILLING_SLUG_GATES)
    assert.ok('raffle' in BILLING_SLUG_GATES)
  })
})
