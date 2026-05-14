import test from 'node:test'
import assert from 'node:assert/strict'

test('OpenClaw capacity governor fails closed on DB and overload signals', async () => {
  const controlPlane = await import('../../.openclaw-build/lib/control-plane.mjs')
  assert.equal(controlPlane.classifyCapacity({ sqliteBusy: true, ioWaitPct: 0 }), 'db-limited')
  const decision = controlPlane.recommendConcurrency({
    sqliteBusy: false,
    ioWaitPct: 0,
    rateLimitActive: false,
    networkErrorRatePct: 0,
    diskFreePct: 6,
    memoryFreePct: 40,
    loadRatio: 0.7,
    queueDepth: 5,
  })

  assert.equal(decision.maxConcurrency, 1)
  assert.equal(decision.state, 'overloaded')
})

test('OpenClaw frontier planner ranks weak high-demand cells first', async () => {
  const controlPlane = await import('../../.openclaw-build/lib/control-plane.mjs')
  const ranked = controlPlane.rankCoverageFrontier([
    {
      state: 'TX',
      category: 'dairy',
      coveragePct: 80,
      stalePct: 5,
      syntheticPct: 2,
      chefDemand: 40,
      sourceReachability: 90,
      accuracyPct: 90,
    },
    {
      state: 'CA',
      category: 'seafood',
      coveragePct: 20,
      stalePct: 35,
      syntheticPct: 25,
      chefDemand: 95,
      sourceReachability: 60,
      accuracyPct: 65,
    },
  ])

  assert.equal(ranked[0].state, 'CA')
  assert.ok(ranked[0].reasonCodes.includes('coverage_gap'))
})

test('OpenClaw source discovery dedupes without approving risky candidates', async () => {
  const controlPlane = await import('../../.openclaw-build/lib/control-plane.mjs')
  const candidates = controlPlane.mergeCandidateSources(
    [],
    [
      { url: 'https://www.example.test/catalog', sourceType: 'wholesale', region: 'ny' },
      { url: 'https://example.test/catalog', sourceType: 'wholesale', region: 'ny' },
    ]
  )

  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].status, 'discovered')
})

test('OpenClaw receipt validation excludes unit-family mismatches', async () => {
  const controlPlane = await import('../../.openclaw-build/lib/control-plane.mjs')
  const result = controlPlane.compareReceiptGroundTruth([
    {
      source: 'receipt',
      category: 'produce',
      receiptCents: 100,
      pieCents: 110,
      receiptUnitFamily: 'weight',
      pieUnitFamily: 'weight',
      relevanceScore: 0.9,
    },
    {
      source: 'receipt',
      category: 'produce',
      receiptCents: 100,
      pieCents: 500,
      receiptUnitFamily: 'count',
      pieUnitFamily: 'weight',
      relevanceScore: 0.9,
    },
  ])

  assert.equal(result.eligibleCount, 1)
  assert.equal(result.excludedCount, 1)
  assert.equal(result.withinThresholdRatePct, 100)
})

test('OpenClaw router dedupes bounded tasks', async () => {
  const controlPlane = await import('../../.openclaw-build/lib/control-plane.mjs')
  const tasks = controlPlane.routeOpenClawTasks([
    { type: 'stale_cell', target: 'NY:produce', priority: 50 },
    { type: 'stale_cell', target: 'NY:produce', priority: 90 },
    { type: 'metadata_gap', target: 'product-1', priority: 20 },
  ])

  assert.equal(tasks.length, 2)
  assert.equal(tasks[0].priority, 90)
})
