// Soak test: Dashboard → Clients → Client Detail → Clients → Dashboard
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

test.describe('Soak: Dashboard → Clients workflow', () => {
  test(`${SOAK_ITERATIONS} iterations of dashboard-clients navigation`, async ({ page }) => {
    const seedIds = loadSeedIds()
    const clientId = seedIds.clientIds.primary
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
      await soakNavigate(page, '/clients')
      await soakNavigate(page, `/clients/${clientId}`)
      await soakNavigate(page, '/clients')
      await soakNavigate(page, '/dashboard')

      const cycleTimeMs = Date.now() - cycleStart

      if (i % CHECKPOINT_INTERVAL === 0 || i === SOAK_ITERATIONS) {
        const checkpoint = await collector.collectCheckpoint(i, cycleTimeMs)
        checkpoints.push(checkpoint)

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
    const report = generateReport('Dashboard → Clients', checkpoints, startedAt, finishedAt)
    printReport(report)

    await test.info().attach('soak-report-clients.json', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    })

    expect(report.failures, `Soak test failures:\n${report.failures.join('\n')}`).toHaveLength(0)
  })
})
