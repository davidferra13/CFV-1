import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PUBLIC_MARKET_SCOPE,
  buildPublicMarketScopeNote,
  readPublicMarketScopeFromSearchParams,
  resolvePublicMarketScope,
} from '@/lib/public/public-market-scope'

test('falls back to the national scope when no location is known', () => {
  const scope = resolvePublicMarketScope()

  assert.equal(scope.label, PUBLIC_MARKET_SCOPE)
  assert.equal(scope.mode, 'national_fallback')
  assert.equal(scope.source, 'default')
  assert.equal(scope.isFallback, true)
})

test('resolves explicit scope labels without creating a parallel scope contract', () => {
  const scope = resolvePublicMarketScope({
    explicitLabel: 'Cambridge, MA',
    source: 'query',
  })

  assert.equal(scope.label, 'Cambridge, MA')
  assert.equal(scope.mode, 'explicit')
  assert.equal(scope.source, 'query')
  assert.equal(scope.isFallback, false)
})

test('reads explicit scope from canonical search params', () => {
  const scope = readPublicMarketScopeFromSearchParams(
    new URLSearchParams({
      market_scope: 'Boston, MA',
      market_scope_mode: 'explicit',
    })
  )

  assert.equal(scope.label, 'Boston, MA')
  assert.equal(scope.mode, 'explicit')
  assert.equal(scope.source, 'query')
  assert.equal(scope.isFallback, false)
})

test('builds honest scope notes for explicit and fallback scopes', () => {
  const explicitScope = resolvePublicMarketScope({
    explicitLabel: 'Boston, MA',
    source: 'request_location',
  })
  const fallbackScope = resolvePublicMarketScope()

  assert.equal(buildPublicMarketScopeNote(explicitScope), 'Scope: Boston, MA.')
  assert.equal(
    buildPublicMarketScopeNote(fallbackScope),
    'Scope: United States national fallback until a narrower market is known.'
  )
})
