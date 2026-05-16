import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_RAIL_FILTER_STATE,
  applyRailFilters,
  clearRailFilterState,
  mapGodModeResolvedItemToCommandSurfaceItem,
  mapPiePriceToCommandSurfaceItem,
  parseRailFilterState,
  riskZoneForPieReliabilityBucket,
  serializeRailFilterState,
  type CommandSurfaceItem,
  type PieCommandSurfaceAdapterInput,
} from '@/lib/command-surface'
import type { GodModeResolvedItem } from '@/lib/discovery/god-mode-types'
import { buildBuyablePriceContract } from '@/lib/pricing/buyable-price-contract'
import type { PieReliabilityBucket } from '@/lib/pricing/pie-reliability'

test('maps God Mode resolved items into command-surface items with visibility and proof', () => {
  const resolved: GodModeResolvedItem = {
    definitionId: 'chef.vendor_waiting',
    tier: 'p1',
    label: 'Vendor COI waiting',
    context: 'Follow up before Friday',
    destination: '/vendors/acme',
    loopState: 'waiting',
    sourceKind: 'vendor',
    evidenceLabel: 'computed',
    confidence: 0.72,
    proofHref: '/vendors/acme',
    inlineActions: [
      {
        label: 'Send reminder',
        action: 'vendor.send_reminder',
        params: { vendorId: 'vendor-1' },
        variant: 'default',
      },
    ],
    data: { sourceId: 'vendor-1' },
  }

  const item = mapGodModeResolvedItemToCommandSurfaceItem(resolved, {
    visibility: { tenantId: 'chef-1', roleAudience: ['chef', 'staff'] },
    playback: { mode: 'playback', reason: 'Historical replay.' },
  })

  assert.equal(item.id, 'chef.vendor_waiting')
  assert.equal(item.sourceKind, 'vendor')
  assert.equal(item.proof?.present, true)
  assert.equal(item.visibility.tenantId, 'chef-1')
  assert.deepEqual(item.proof?.visibility.roleAudience, ['chef', 'staff'])
  assert.equal(item.playback.readOnly, true)
  assert.equal(item.actions.find((action) => action.kind === 'mutation')?.mutation?.enabled, false)
})

test('rail filters serialize, reset to live scope, and count hidden P0/P1 items', () => {
  const items = [
    itemFixture({ id: 'p0-menu', tier: 'p0', domain: 'menus', sourceKind: 'menu' }),
    itemFixture({ id: 'p1-pie', tier: 'p1', domain: 'pricing', sourceKind: 'pie' }),
    itemFixture({ id: 'p2-vendor', tier: 'p2', domain: 'vendors', sourceKind: 'vendor' }),
    itemFixture({ id: 'done-critical', tier: 'p1', loopState: 'done', domain: 'menus' }),
  ]

  const filtered = applyRailFilters(items, {
    ...DEFAULT_RAIL_FILTER_STATE,
    domains: ['pricing'],
    tiers: ['p1'],
    sourceKinds: ['pie'],
    evidence: ['confirmed'],
    confidence: 'high',
  })

  assert.deepEqual(
    filtered.items.map((item) => item.id),
    ['p1-pie']
  )
  assert.equal(filtered.hiddenCriticalCount, 2)

  const serialized = serializeRailFilterState(filtered.state)
  assert.equal(serialized, 'confidence=high&domain=pricing&evidence=confirmed&source=pie&tier=p1')
  assert.deepEqual(parseRailFilterState(serialized), filtered.state)
  assert.deepEqual(clearRailFilterState(), DEFAULT_RAIL_FILTER_STATE)
})

test('rail filters handle empty results and missing-proof evidence filters', () => {
  const missingProof = itemFixture({
    id: 'p0-missing',
    tier: 'p0',
    evidenceLabel: 'unknown',
    proofPresent: false,
    riskZone: 'missing_proof',
  })
  const filtered = applyRailFilters([missingProof], {
    ...DEFAULT_RAIL_FILTER_STATE,
    evidence: ['has_proof'],
  })

  assert.equal(filtered.visibleCount, 0)
  assert.equal(filtered.hiddenCriticalCount, 1)
  assert.equal(
    applyRailFilters([missingProof], {
      ...DEFAULT_RAIL_FILTER_STATE,
      evidence: ['missing_proof'],
    }).visibleCount,
    1
  )
})

test('PIE reliability buckets map into command-surface risk zones', () => {
  const expected: Record<PieReliabilityBucket, string> = {
    direct_observed: 'ready',
    regional_observed: 'watch',
    national_observed: 'watch',
    estimated: 'synthetic_or_modeled',
    synthetic: 'synthetic_or_modeled',
    stale: 'stale',
    suspicious: 'degraded',
  }

  for (const [bucket, zone] of Object.entries(expected) as [PieReliabilityBucket, string][]) {
    assert.equal(riskZoneForPieReliabilityBucket(bucket), zone)
  }
})

test('PIE adapter derives missing proof, stale/degraded, disputed, synthetic, and playback states', () => {
  const missing = mapPiePriceToCommandSurfaceItem({
    ...pieInput('missing', {
      priceCents: null,
      confidenceScore: 0,
      resolutionTier: 'none',
      freshnessDays: null,
      dataPoints: 0,
    }),
    reliability: 'suspicious',
  })
  assert.equal(missing.riskZone, 'missing_proof')

  const stale = mapPiePriceToCommandSurfaceItem({
    ...pieInput('stale', {
      priceCents: 399,
      confidenceScore: 0.7,
      resolutionTier: 'regional',
      freshnessDays: 40,
      dataPoints: 5,
      sourceAvailable: false,
    }),
    reliability: 'stale',
    lifecycle: 'fallback-served',
  })
  assert.equal(stale.riskZone, 'stale')
  assert.ok(stale.riskSignals.some((signal) => signal.zone === 'degraded'))

  const disputed = mapPiePriceToCommandSurfaceItem({
    ...pieInput('disputed', {
      priceCents: 260,
      confidenceScore: 0.9,
      resolutionTier: 'chef_receipt',
      freshnessDays: 1,
      dataPoints: 1,
      storeName: 'Acme Market',
      productName: 'Apples',
      zipRequested: '10001',
      unit: 'lb',
      observedAt: '2026-05-15T12:00:00.000Z',
    }),
    reliability: 'direct_observed',
    lifecycle: 'disputed',
  })
  assert.equal(disputed.riskZone, 'disputed')
  assert.equal(disputed.evidenceLabel, 'disputed')

  const synthetic = mapPiePriceToCommandSurfaceItem({
    ...pieInput('synthetic', {
      priceCents: 180,
      confidenceScore: 0.4,
      resolutionTier: 'estimated',
      freshnessDays: 3,
      dataPoints: 2,
      sourceLabels: ['modelled baseline'],
    }),
    reliability: 'estimated',
    playback: { mode: 'playback', reason: 'Replay mode.' },
  })
  assert.equal(synthetic.riskZone, 'synthetic_or_modeled')
  assert.ok(synthetic.riskSignals.some((signal) => signal.zone === 'synthetic_or_modeled'))
  assert.equal(
    synthetic.actions.find((action) => action.kind === 'mutation')?.mutation?.enabled,
    false
  )
  assert.equal(
    synthetic.actions.find((action) => action.kind === 'mutation')?.mutation?.readOnlyBlocked,
    true
  )
})

function pieInput(
  id: string,
  overrides: Parameters<typeof buildBuyablePriceContract>[0]
): PieCommandSurfaceAdapterInput {
  return {
    id,
    ingredientName: `Ingredient ${id}`,
    contract: buildBuyablePriceContract(overrides),
    href: `/pricing/${id}`,
    proofHref: `/pricing/${id}/proof`,
    visibility: { tenantId: 'chef-1', roleAudience: ['chef'] },
  }
}

function itemFixture(overrides: Partial<CommandSurfaceItem>): CommandSurfaceItem {
  const riskZone = overrides.riskZone ?? 'ready'

  return {
    id: overrides.id ?? 'item',
    title: overrides.title ?? 'Item',
    description: overrides.description ?? null,
    domain: overrides.domain ?? 'menus',
    href: overrides.href ?? '/menus',
    sourceKind: overrides.sourceKind ?? 'menu',
    tier: overrides.tier ?? 'p2',
    loopState: overrides.loopState ?? 'active',
    evidenceLabel: overrides.evidenceLabel ?? 'confirmed',
    confidence: overrides.confidence ?? 0.9,
    proof: {
      id: `${overrides.id ?? 'item'}:proof`,
      label: 'Proof',
      present:
        overrides.proof?.present ?? (overrides as { proofPresent?: boolean }).proofPresent ?? true,
      href: '/proof',
      evidenceLabel: overrides.evidenceLabel ?? 'confirmed',
      confidence: overrides.confidence ?? 0.9,
      visibility: {
        scope: 'tenant',
        tenantId: 'chef-1',
        roleAudience: ['chef'],
      },
    },
    riskZone,
    riskSignals:
      riskZone === 'ready'
        ? [{ zone: 'ready', reason: 'Ready.' }]
        : [{ zone: riskZone, reason: `${riskZone}.` }],
    actions: [],
    visibility: {
      scope: 'tenant',
      tenantId: 'chef-1',
      roleAudience: ['chef'],
    },
    playback: {
      mode: 'live',
      readOnly: false,
    },
    ...overrides,
  }
}
