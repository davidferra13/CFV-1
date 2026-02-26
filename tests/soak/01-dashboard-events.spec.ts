// Soak test: Dashboard → Events → Event Detail → Edit → Events → Dashboard
// Repeats N times to detect memory leaks, DOM growth, and performance degradation.

import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import {
  SOAK_ITERATIONS,
  CHECKPOINT_INTERVAL,
  EARLY_ABORT_FACTOR,
  SoakMetricsCollector,
  soakNavigate,
  generateReport,
  printReport,
  type Checkpoint,
} from './soak-utils'

function loadSeedIds() {
  const raw = readFileSync('.auth/seed-ids.json', 'utf-8')
  return JSON.parse(raw)
}

test.describe('Soak: Dashboard → Events workflow', () => {
  test(`${SOAK_ITERATIONS} iterations of dashboard-events navigation`, async ({ page }) => {
    const seedIds = loadSeedIds()
    const eventId = seedIds.eventIds.draft
    const collector = new SoakMetricsCollector(page)
    const checkpoints: Checkpoint[] = []
    const startedAt = new Date()

    // ── Baseline ──
    await soakNavigate(page, '/dashboard')
    const baseline = await collector.collectCheckpoint(0, 0)
    checkpoints.push(baseline)

    // ── Main loop ──
    for (let i = 1; i <= SOAK_ITERATIONS; i++) {
      const cycleStart = Date.now()

      await soakNavigate(page, '/dashboard')
      await soakNavigate(page, '/events')
      await soakNavigate(page, `/events/${eventId}`)
      await soakNavigate(page, `/events/${eventId}/edit`)
      await soakNavigate(page, '/events')
      await soakNavigate(page, '/dashboard')

      const cycleTimeMs = Date.now() - cycleStart

      // Checkpoint every N iterations + always on the last iteration
      if (i % CHECKPOINT_INTERVAL === 0 || i === SOAK_ITERATIONS) {
        const checkpoint = await collector.collectCheckpoint(i, cycleTimeMs)
        checkpoints.push(checkpoint)

        // Early abort: catastrophic memory growth
        if (checkpoint.heapUsedBytes > baseline.heapUsedBytes * EARLY_ABORT_FACTOR) {
          console.error(
            `EARLY ABORT at iteration ${i}: memory is ${(checkpoint.heapUsedBytes / baseline.heapUsedBytes).toFixed(1)}x baseline. Stopping.`
          )
          break
        }
      }
    }

    // ── Report ──
    const finishedAt = new Date()
    const report = generateReport('Dashboard → Events', checkpoints, startedAt, finishedAt)
    printReport(report)

    // Attach JSON report as test artifact
    await test.info().attach('soak-report-events.json', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    })

    // Assert
    expect(report.failures, `Soak test failures:\n${report.failures.join('\n')}`).toHaveLength(0)
  })
})
