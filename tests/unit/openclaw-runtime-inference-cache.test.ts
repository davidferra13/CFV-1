import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import type { TestContext } from 'node:test'
import { pathToFileURL } from 'node:url'

const runtimeDbModuleUrl = pathToFileURL(join(process.cwd(), '.openclaw-build/lib/db.mjs')).href

async function loadRuntimeDbModule(dbPath: string) {
  process.env.OPENCLAW_DB_PATH = dbPath
  return import(`${runtimeDbModuleUrl}?t=${Date.now()}-${Math.random()}`)
}

async function withRuntimeDb(
  t: TestContext,
  fn: (mod: Awaited<ReturnType<typeof loadRuntimeDbModule>>) => void | Promise<void>
) {
  const tempDir = mkdtempSync(join(tmpdir(), 'openclaw-inference-cache-'))
  const dbPath = join(tempDir, 'prices.db')
  const mod = await loadRuntimeDbModule(dbPath)

  t.after(() => {
    mod.closeDb()
    delete process.env.OPENCLAW_DB_PATH
    rmSync(tempDir, { recursive: true, force: true })
  })

  await fn(mod)
}

test(
  'seeds the explicit inference cache slice with a KPI contract',
  { concurrency: false },
  async (t) => {
    await withRuntimeDb(t, async (mod) => {
      const db = mod.getDb()
      const seeded = mod
        .listRuntimeSlices(db)
        .find(
          (slice: { sliceKey: string }) => slice.sliceKey === 'explicit-inference-cache-audit-plane'
        )

      assert.ok(seeded, 'expected the inference cache slice to be seeded')
      assert.equal(seeded.ownerClassification, 'runtime-owned')
      assert.equal(seeded.gateStatus, 'ready')
      assert.ok(
        seeded.kpis.some(
          (kpi: { metricName: string }) =>
            kpi.metricName === 'active_inference_provenance_completeness_rate'
        )
      )
    })
  }
)

test(
  'stores inferred prices separately with explicit provenance and coalesces unique inference keys',
  { concurrency: false },
  async (t) => {
    await withRuntimeDb(t, async (mod) => {
      const db = mod.getDb()

      const first = mod.upsertPriceInferenceCacheEntry(
        db,
        {
          canonicalIngredientId: 'chicken-breast-boneless-skinless',
          geographyType: 'state',
          geographyKey: 'ma',
          pricingTier: 'retail',
          priceCents: 899,
          priceUnit: 'lb',
          confidence: 0.82,
          method: 'chain_blend',
          basedOnDirectCount: 3,
          basedOnRegion: 'new-england',
          modelVersion: 'inference-v1',
          computedAt: '2026-04-21T00:00:00.000Z',
          expiresAt: '2026-04-28T00:00:00.000Z',
          evidence: [
            {
              truthLabel: 'observed',
              sourceId: 'shaws-haverhill',
              geographyType: 'state',
              geographyKey: 'ma',
              priceCents: 879,
              priceUnit: 'lb',
              observedAt: '2026-04-20T00:00:00.000Z',
            },
            {
              sourceId: 'stop-and-shop-methuen',
              geographyType: 'state',
              geographyKey: 'ma',
              priceCents: 919,
              priceUnit: 'lb',
            },
          ],
        },
        { now: '2026-04-21T00:00:00.000Z' }
      )

      assert.equal(first.truthLabel, 'inferred')
      assert.equal(first.state, 'active')
      assert.equal(first.evidence[0]?.truthLabel, 'observed')
      assert.equal(first.evidence[1]?.truthLabel, 'derived')

      const currentPriceCount = db
        .prepare('SELECT COUNT(*) as count FROM current_prices')
        .get() as {
        count: number
      }
      assert.equal(currentPriceCount.count, 0, 'inference cache must not write to current_prices')

      const second = mod.upsertPriceInferenceCacheEntry(
        db,
        {
          canonicalIngredientId: 'chicken-breast-boneless-skinless',
          geographyType: 'state',
          geographyKey: 'ma',
          pricingTier: 'retail',
          priceCents: 905,
          priceUnit: 'lb',
          confidence: 0.84,
          method: 'chain_blend',
          basedOnDirectCount: 4,
          basedOnRegion: 'new-england',
          modelVersion: 'inference-v1',
          computedAt: '2026-04-21T01:00:00.000Z',
          expiresAt: '2026-04-29T00:00:00.000Z',
          evidence: [
            {
              truthLabel: 'observed',
              sourceId: 'market-basket-haverhill',
              geographyType: 'state',
              geographyKey: 'ma',
              priceCents: 905,
              priceUnit: 'lb',
            },
          ],
        },
        { now: '2026-04-21T01:00:00.000Z' }
      )

      assert.equal(second.cacheId, first.cacheId)
      assert.equal(second.priceCents, 905)
      assert.equal(second.basedOnDirectCount, 4)
      assert.equal(
        mod.listPriceInferenceCacheEntries(db, {
          canonicalIngredientId: 'chicken-breast-boneless-skinless',
          state: 'all',
        }).length,
        1
      )
    })
  }
)

test(
  'filters active rows by default, tracks expiry and invalidation separately, and prunes expired entries',
  { concurrency: false },
  async (t) => {
    await withRuntimeDb(t, async (mod) => {
      const db = mod.getDb()

      const active = mod.upsertPriceInferenceCacheEntry(
        db,
        {
          canonicalIngredientId: 'olive-oil-extra-virgin',
          geographyType: 'region',
          geographyKey: 'new-england',
          pricingTier: 'retail',
          priceCents: 1299,
          priceUnit: 'each',
          confidence: 0.77,
          method: 'regional_baseline',
          basedOnDirectCount: 5,
          basedOnRegion: 'new-england',
          modelVersion: 'inference-v1',
          computedAt: '2026-04-21T00:00:00.000Z',
          expiresAt: '2026-04-30T00:00:00.000Z',
          evidence: [{ truthLabel: 'observed', sourceId: 'whole-foods-brookline' }],
        },
        { now: '2026-04-21T00:00:00.000Z' }
      )

      mod.upsertPriceInferenceCacheEntry(
        db,
        {
          canonicalIngredientId: 'olive-oil-extra-virgin',
          geographyType: 'national',
          geographyKey: 'us',
          pricingTier: 'retail',
          priceCents: 1399,
          priceUnit: 'each',
          confidence: 0.61,
          method: 'nearest_neighbor',
          basedOnDirectCount: 2,
          basedOnRegion: 'mid-atlantic',
          modelVersion: 'inference-v1',
          computedAt: '2026-04-20T00:00:00.000Z',
          expiresAt: '2026-04-20T12:00:00.000Z',
          evidence: [{ truthLabel: 'observed', sourceId: 'target-salem' }],
        },
        { now: '2026-04-21T00:00:00.000Z' }
      )

      const invalidated = mod.invalidatePriceInferenceCacheEntry(
        db,
        {
          cacheId: active.cacheId,
          invalidationReason: 'Superseded by direct price scrape',
        },
        { now: '2026-04-21T02:00:00.000Z' }
      )

      assert.equal(invalidated?.state, 'invalidated')
      assert.equal(invalidated?.invalidationReason, 'Superseded by direct price scrape')

      const activeRows = mod.listPriceInferenceCacheEntries(db)
      const expiredRows = mod.listPriceInferenceCacheEntries(
        db,
        { state: 'expired' },
        { now: '2026-04-21T03:00:00.000Z' }
      )
      const invalidatedRows = mod.listPriceInferenceCacheEntries(
        db,
        { state: 'invalidated' },
        { now: '2026-04-21T03:00:00.000Z' }
      )

      assert.equal(
        activeRows.length,
        0,
        'default inference reads should exclude expired and invalidated rows'
      )
      assert.equal(expiredRows.length, 1)
      assert.equal(invalidatedRows.length, 1)

      const summary = mod.getPriceInferenceAuditOverview(
        db,
        {},
        { now: '2026-04-21T03:00:00.000Z' }
      )
      assert.equal(summary.activeCount, 0)
      assert.equal(summary.expiredCount, 1)
      assert.equal(summary.invalidatedCount, 1)

      const overview = mod.getRuntimeQueueOverview(db, {
        now: '2026-04-21T03:00:00.000Z',
      })
      assert.equal(overview.activeInferenceCount, 0)
      assert.equal(overview.expiredInferenceCount, 1)
      assert.equal(overview.invalidatedInferenceCount, 1)

      const prune = mod.pruneExpiredPriceInferenceCacheEntries(db, {
        now: '2026-04-21T03:00:00.000Z',
      })
      assert.equal(prune.prunedCount, 1)

      const remaining = mod.listPriceInferenceCacheEntries(
        db,
        { state: 'all' },
        { now: '2026-04-21T03:00:00.000Z' }
      )
      assert.equal(remaining.length, 1)
      assert.equal(remaining[0].state, 'invalidated')
    })
  }
)
