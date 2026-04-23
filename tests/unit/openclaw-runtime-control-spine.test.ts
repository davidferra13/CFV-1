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
  const tempDir = mkdtempSync(join(tmpdir(), 'openclaw-runtime-control-'))
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
  'seeds the durable runtime control slice and coalesces active dedupe keys',
  { concurrency: false },
  async (t) => {
    await withRuntimeDb(t, async (mod) => {
      const db = mod.getDb()
      const slices = mod.listRuntimeSlices(db)
      const seeded = slices.find(
        (slice: { sliceKey: string }) => slice.sliceKey === 'durable-runtime-task-incident-dedupe-spine'
      )

      assert.ok(seeded, 'expected the runtime control slice to be seeded')
      assert.equal(seeded.gateStatus, 'ready')
      assert.equal(seeded.status, 'ready')
      assert.equal(seeded.ownerClassification, 'runtime-owned')
      assert.ok(
        seeded.kpis.some((kpi: { metricName: string }) => kpi.metricName === 'active_task_duplication_rate')
      )

      const first = mod.enqueueAgentTask(db, {
        taskType: 'repair_source',
        preferredAgentType: 'repair',
        sourceId: 'source-1',
        dedupeKey: 'repair:source-1',
        payload: { idempotent: true },
      })
      const duplicate = mod.enqueueAgentTask(db, {
        taskType: 'repair_source',
        preferredAgentType: 'repair',
        sourceId: 'source-1',
        dedupeKey: 'repair:source-1',
        payload: { idempotent: true, requestedBy: 'repeat' },
      })

      assert.equal(first.created, true)
      assert.equal(first.deduped, false)
      assert.equal(duplicate.created, false)
      assert.equal(duplicate.deduped, true)
      assert.equal(duplicate.task.taskId, first.task.taskId)
      assert.equal(mod.listAgentTasks(db).length, 1)

      const overview = mod.getRuntimeQueueOverview(db)
      assert.equal(overview.taskStatusCounts.queued, 1)
      assert.equal(overview.queueCounts[0].queueName, 'default')
    })
  }
)

test(
  'claims, heartbeats, and recovers expired leased tasks with dead-letter fallback',
  { concurrency: false },
  async (t) => {
    await withRuntimeDb(t, async (mod) => {
      const db = mod.getDb()
      const startedAt = '2026-04-21T00:00:00.000Z'

      const run = mod.startAgentRun(
        db,
        {
          agentType: 'repair',
          queueName: 'default',
          hostName: 'pi-test-host',
          leaseSeconds: 60,
        },
        { now: startedAt }
      )

      const safeTask = mod.enqueueAgentTask(
        db,
        {
          taskType: 'repair_source',
          preferredAgentType: 'repair',
          priority: 90,
          dedupeKey: 'repair:safe',
          payload: { idempotent: true },
        },
        { now: startedAt }
      ).task
      const unsafeTask = mod.enqueueAgentTask(
        db,
        {
          taskType: 'repair_source',
          preferredAgentType: 'repair',
          priority: 80,
          dedupeKey: 'repair:unsafe',
          payload: { idempotent: false },
        },
        { now: startedAt }
      ).task

      const claimedSafe = mod.claimNextAgentTask(
        db,
        { preferredAgentType: 'repair' },
        { runId: run.runId, now: startedAt, leaseSeconds: 60 }
      )
      assert.equal(claimedSafe.taskId, safeTask.taskId)

      const runningSafe = mod.markAgentTaskRunning(db, claimedSafe.taskId, {
        runId: run.runId,
        now: startedAt,
        leaseSeconds: 60,
      })
      const heartbeat = mod.heartbeatAgentTask(db, runningSafe.taskId, {
        runId: run.runId,
        now: '2026-04-21T00:00:30.000Z',
        leaseSeconds: 60,
      })
      assert.equal(heartbeat.leaseExpiresAt, '2026-04-21T00:01:30.000Z')

      const claimedUnsafe = mod.claimNextAgentTask(
        db,
        { preferredAgentType: 'repair' },
        { runId: run.runId, now: startedAt, leaseSeconds: 60 }
      )
      assert.equal(claimedUnsafe.taskId, unsafeTask.taskId)

      mod.markAgentTaskRunning(db, claimedUnsafe.taskId, {
        runId: run.runId,
        now: startedAt,
        leaseSeconds: 60,
      })

      const recovery = mod.recoverExpiredAgentTasks(db, {
        now: '2026-04-21T00:02:31.000Z',
      })

      assert.equal(recovery.expiredCount, 2)
      assert.equal(recovery.requeuedCount, 1)
      assert.equal(recovery.deadLetterCount, 1)
      assert.deepEqual(recovery.requeuedTaskIds, [safeTask.taskId])
      assert.deepEqual(recovery.deadLetterTaskIds, [unsafeTask.taskId])

      const recoveredSafe = mod.getAgentTask(db, safeTask.taskId)
      const recoveredUnsafe = mod.getAgentTask(db, unsafeTask.taskId)
      assert.equal(recoveredSafe.status, 'queued')
      assert.match(recoveredSafe.lastError, /Lease expired/)
      assert.equal(recoveredSafe.claimedByRunId, null)
      assert.equal(recoveredUnsafe.status, 'dead_letter')
      assert.match(recoveredUnsafe.lastError, /Lease expired/)
    })
  }
)

test(
  'coalesces source incidents, labels evidence truthfully, and records rate-limit backoff',
  { concurrency: false },
  async (t) => {
    await withRuntimeDb(t, async (mod) => {
      const db = mod.getDb()

      db.prepare(`
        INSERT INTO source_registry (source_id, name, type, scrape_method)
        VALUES (?, ?, ?, ?)
      `).run('source-429', 'Rate Limited Source', 'grocery', 'api')

      const first = mod.upsertSourceIncident(
        db,
        {
          sourceId: 'source-429',
          incidentType: 'http',
          severity: 'medium',
          summary: 'HTTP 429 received from source',
          evidence: [
            { truthLabel: 'observed', httpStatus: 429 },
            { retryAfterSeconds: 60 },
          ],
        },
        { now: '2026-04-21T01:00:00.000Z' }
      )

      assert.equal(first.status, 'open')
      assert.equal(first.consecutiveFailures, 1)
      assert.equal(first.evidence[0].truthLabel, 'observed')
      assert.equal(first.evidence[1].truthLabel, 'derived')

      const repeated = mod.upsertSourceIncident(
        db,
        {
          sourceId: 'source-429',
          incidentType: 'http',
          severity: 'high',
          summary: 'HTTP 429 repeated during retry window',
          evidence: { truthLabel: 'observed', httpStatus: 429, attempt: 2 },
        },
        { now: '2026-04-21T01:05:00.000Z' }
      )

      assert.equal(repeated.incidentId, first.incidentId)
      assert.equal(repeated.severity, 'high')
      assert.equal(repeated.consecutiveFailures, 2)
      assert.equal(repeated.evidence.length, 3)

      const backoff = mod.setSourceRateLimitBackoff(
        db,
        {
          sourceId: 'source-429',
          backoffUntil: '2026-04-21T02:00:00.000Z',
          summary: 'Back off source after repeated 429 responses',
          evidence: [{ truthLabel: 'observed', httpStatus: 429, retryAfterSeconds: 300 }],
        },
        { now: '2026-04-21T01:10:00.000Z' }
      )

      assert.equal(backoff.rateLimitBackoffUntil, '2026-04-21T02:00:00.000Z')

      const openIncidents = mod.listSourceIncidents(db, {
        sourceId: 'source-429',
        status: 'open',
      })
      assert.equal(openIncidents.length, 1)
      assert.equal(openIncidents[0].consecutiveFailures, 3)
      assert.equal(
        openIncidents[0].evidence[openIncidents[0].evidence.length - 1]?.truthLabel,
        'observed'
      )

      const resolved = mod.resolveSourceIncident(
        db,
        openIncidents[0].incidentId,
        {
          summary: 'Backoff window observed and incident resolved',
          evidence: [{ resolution: 'retry window expired without new failures' }],
          now: '2026-04-21T02:10:00.000Z',
        }
      )

      assert.equal(resolved.status, 'resolved')
      assert.equal(
        resolved.evidence[resolved.evidence.length - 1]?.truthLabel,
        'derived'
      )
      assert.equal(resolved.resolvedAt, '2026-04-21T02:10:00.000Z')

      const overview = mod.getRuntimeQueueOverview(db, {
        now: '2026-04-21T01:10:00.000Z',
      })
      assert.equal(overview.activeBackoffSourceCount, 1)
    })
  }
)
