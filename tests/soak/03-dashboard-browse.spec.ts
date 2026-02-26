// Soak test: Dashboard → Recipes → Dashboard → Inquiries → Dashboard → Financials → Dashboard
// Tests breadth — hits multiple React component trees in each cycle to detect
// cross-tree state accumulation and leaked subscriptions.

import { test, expect } from '@playwright/test'
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

test.describe('Soak: Dashboard → Multi-page browse', () => {
  test(`${SOAK_ITERATIONS} iterations of dashboard multi-page browsing`, async ({ page }) => {
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
      await soakNavigate(page, '/recipes')
      await soakNavigate(page, '/dashboard')
      await soakNavigate(page, '/inquiries')
      await soakNavigate(page, '/dashboard')
      await soakNavigate(page, '/financials')
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
    const report = generateReport(
      'Dashboard → Multi-page Browse',
      checkpoints,
      startedAt,
      finishedAt
    )
    printReport(report)

    await test.info().attach('soak-report-browse.json', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    })

    expect(report.failures, `Soak test failures:\n${report.failures.join('\n')}`).toHaveLength(0)
  })
})
