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
  const tempDir = mkdtempSync(join(tmpdir(), 'openclaw-governor-'))
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
  'seeds the machine-readable registry slice and marks it gate-ready',
  { concurrency: false },
  async (t) => {
    await withRuntimeDb(t, async (mod) => {
      const db = mod.getDb()
      const slices = mod.listRuntimeSlices(db)
      const seeded = slices.find(
        (slice: { sliceKey: string }) =>
          slice.sliceKey === 'machine-readable-slice-registry-kpi-gate'
      )

      assert.ok(seeded, 'expected the governance slice to be seeded')
      assert.equal(seeded.gateStatus, 'ready')
      assert.equal(seeded.status, 'ready')
      assert.equal(seeded.kpis.length, 1)
      assert.equal(seeded.kpis[0].goalDirection, 'maximize')
    })
  }
)

test(
  'blocks a slice from being marked ready when no KPI contract is registered',
  { concurrency: false },
  async (t) => {
    await withRuntimeDb(t, async (mod) => {
      const db = mod.getDb()
      const sliceInput = {
        sliceKey: 'missing-kpi-contract',
        displayName: 'Missing KPI Contract',
        objective: 'Demonstrate gate blocking for incomplete runtime slices.',
        ownerClassification: 'runtime-owned',
        status: 'planned',
        files: ['.openclaw-build/lib/db.mjs'],
        invariants: ['Internal-only governance data'],
        nonGoals: ['No queue implementation'],
        baselinePlan: 'Capture the first gate snapshot before promoting the slice.',
        minimumSampleSize: 5,
        calibrationStatus: 'pending',
      }

      const planned = mod.upsertSliceRegistration(db, sliceInput)
      assert.equal(planned.gateStatus, 'blocked')

      assert.throws(
        () => mod.upsertSliceRegistration(db, { ...sliceInput, status: 'ready' }),
        /KPI gate blocked/
      )

      const gate = mod.evaluateSliceGate(db, sliceInput.sliceKey)
      assert.equal(gate.status, 'blocked')
      assert.match(gate.blockers.join(' '), /No KPI contracts registered/)
    })
  }
)

test(
  'requires explicit KPI direction and allows readiness once a complete contract exists',
  { concurrency: false },
  async (t) => {
    await withRuntimeDb(t, async (mod) => {
      const db = mod.getDb()
      const sliceInput = {
        sliceKey: 'complete-kpi-contract',
        displayName: 'Complete KPI Contract',
        objective: 'Verify that complete KPI contracts unlock the ready gate.',
        ownerClassification: 'runtime-owned',
        status: 'planned',
        files: ['.openclaw-build/services/sync-api.mjs'],
        invariants: ['No public exposure'],
        nonGoals: ['No browser UI'],
        baselinePlan: 'Use the first three registered slices as the structural readiness baseline.',
        minimumSampleSize: 3,
        calibrationStatus: 'provisional',
      }

      mod.upsertSliceRegistration(db, sliceInput)

      assert.throws(
        () =>
          mod.upsertSliceKpiContract(db, {
            sliceKey: sliceInput.sliceKey,
            metricName: 'missing_direction',
            whyItMatters: 'Directionless KPIs are ambiguous.',
            formula: 'ready_slices / total_registered_slices',
            targetValue: 1,
            warningThreshold: 0.8,
            failureThreshold: 0.5,
            measurementWindow: 'current registry snapshot',
            dataSource: 'slice_registry.gate_status',
            owner: 'goal-governor-agent',
            reviewCadence: 'daily',
            slicePhase: 'governance',
            leadingOrLagging: 'leading',
            baselineValue: 0,
            baselineWindow: 'initial snapshot',
            minimumSampleSize: 3,
            calibrationStatus: 'provisional',
          }),
        /goalDirection/
      )

      const ready = mod.upsertRuntimeSliceBundle(
        db,
        { ...sliceInput, status: 'ready' },
        [
          {
            sliceKey: sliceInput.sliceKey,
            metricName: 'registry_gate_readiness_rate',
            whyItMatters: 'The slice is only launchable when KPI structure is complete.',
            formula: 'ready_slices / total_registered_slices',
            goalDirection: 'maximize',
            targetValue: 1,
            warningThreshold: 0.8,
            failureThreshold: 0.5,
            measurementWindow: 'current registry snapshot',
            dataSource: 'slice_registry.gate_status',
            owner: 'goal-governor-agent',
            reviewCadence: 'on mutation',
            slicePhase: 'governance',
            leadingOrLagging: 'leading',
            baselineValue: 0,
            baselineWindow: 'initial snapshot',
            minimumSampleSize: 3,
            calibrationStatus: 'provisional',
          },
        ]
      )

      assert.equal(ready.status, 'ready')
      assert.equal(ready.gateStatus, 'ready')
      assert.equal(ready.kpis.length, 1)
    })
  }
)
