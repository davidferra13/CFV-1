import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { UniversalPriceProofCard } from '@/components/pricing/universal-price-proof-card'
import { buildBuyablePriceContract, priceProofApiShape } from '@/lib/pricing/buyable-price-contract'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('public PIE single-price API exposes the universal buyable price proof contract', () => {
  const route = read('app/api/pie/v1/price/route.ts')
  const routePolicy = read('lib/auth/route-policy.ts')
  const lookup = read('lib/pricing/universal-price-lookup.ts')
  const contract = read('lib/pricing/buyable-price-contract.ts')
  const component = read('components/pricing/universal-price-proof-card.tsx')

  assert.match(lookup, /buyable_price: BuyablePriceContract/)
  assert.match(lookup, /buildBuyablePriceContract/)
  assert.match(route, /buyable_price: result\.buyable_price/)
  assert.match(route, /price_proof: priceProofApiShape\(result\.buyable_price\)/)
  assert.match(routePolicy, /'\/api\/pie'/)

  assert.match(contract, /safeForShopping: boolean/)
  assert.match(contract, /requiredProof: string\[\]/)
  assert.match(contract, /missingProof: string\[\]/)
  assert.match(contract, /recommendedAction: string/)
  assert.match(contract, /proof: BuyablePriceProof/)
  assert.match(component, /contract: BuyablePriceContract/)
  assert.match(component, /contract\.missingProof/)
  assert.match(component, /contract\.safeForShopping/)
})

test('buyable price proof contract carries source health and honest trust labels', () => {
  const contract = read('lib/pricing/buyable-price-contract.ts')

  assert.match(contract, /confirmed_local_buyable/)
  assert.match(contract, /recent_local_observed/)
  assert.match(contract, /regional_market_estimate/)
  assert.match(contract, /modeled_estimate/)
  assert.match(contract, /No trusted price/)
  assert.match(contract, /sourceHealth: BuyablePriceSourceHealth/)
})

test('buyable price proof contract exposes safe API fields without raw local identifiers', () => {
  const proof = buildBuyablePriceContract({
    priceCents: 299,
    confidenceScore: 0.05,
    resolutionTier: 'estimated',
    freshnessDays: null,
    dataPoints: 0,
    unit: 'each',
    sourceLabels: ['synthetic_floor'],
    sourceAvailable: false,
  })

  const api = priceProofApiShape(proof)

  assert.equal(api.safe_for_shopping, false)
  assert.equal(api.price_state, 'synthetic_or_modeled')
  assert.equal(api.fallback_tier, 'estimated')
  assert.equal(api.local_proof.present, false)
  assert.equal(api.freshness.label, 'unknown')
  assert.equal(api.recommended_action, 'Confirm manually before quoting or shopping.')
  assert.ok(api.missing_proof.includes('current store or vendor observation'))
  assert.equal(Object.hasOwn(api, 'storeName'), false)
  assert.equal(Object.hasOwn(api, 'productName'), false)
  assert.equal(Object.hasOwn(api, 'zipRequested'), false)
})

test('universal price proof card renders fallback, freshness, local proof, and next action', () => {
  const proof = buildBuyablePriceContract({
    priceCents: 199,
    confidenceScore: 0.56,
    resolutionTier: 'regional',
    freshnessDays: 21,
    dataPoints: 4,
    unit: 'lb',
    sourceLabels: ['regional_average'],
  })

  const markup = renderToStaticMarkup(
    React.createElement(UniversalPriceProofCard, { contract: proof })
  )

  assert.match(markup, /Regional estimate/)
  assert.match(markup, /Fallback tier/)
  assert.match(markup, /real nonlocal/)
  assert.match(markup, /medium confidence/)
  assert.match(markup, /Use for costing, not a shopping promise/)
  assert.match(markup, /Local proof/)
  assert.match(markup, /Incomplete/)
  assert.match(markup, /Missing proof/)
})
