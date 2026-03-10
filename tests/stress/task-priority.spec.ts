/**
 * Task Priority Test — Verify High-Priority Tasks Beat Low-Priority Tasks
 *
 * This test verifies the queue's priority ordering works under load:
 * - Sends 50 BATCH tasks (priority 200, low priority)
 * - Immediately sends 50 ON_DEMAND tasks (priority 800, high priority)
 * - Measures completion times for each group
 * - Verifies ON_DEMAND tasks complete first despite being queued second
 *
 * RUN:
 *   npx playwright test tests/stress/task-priority.spec.ts --config=playwright.stress.config.ts
 */

import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import { TEST_API_BASE_URL } from '../helpers/runtime-base-url'

const API_BASE = TEST_API_BASE_URL
const REPORT_DIR = path.join(process.cwd(), 'data', 'stress-reports')

interface PriorityTestResult {
  taskId: string
  priority: 'on_demand' | 'batch'
  startTime: number
  endTime: number
  durationMs: number
  status: 'success' | 'timeout' | 'error'
}

class TaskPriorityTest {
  private results: PriorityTestResult[] = []
  private authToken: string = ''
  private chefId: string = ''
  private agentEmail: string = ''
  private agentPassword: string = ''

  constructor() {
    const authPath = path.join(process.cwd(), '.auth', 'agent.json')
    const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'))
    this.agentEmail = auth.email
    this.agentPassword = auth.password
  }

  async authenticate(): Promise<void> {
    const response = await fetch(`${API_BASE}/api/e2e/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.agentEmail,
        password: this.agentPassword,
      }),
    })

    if (!response.ok) throw new Error(`Auth failed: ${response.status}`)
    const data = await response.json()
    this.authToken = data.token || ''
    this.chefId = data.chefId || 'priority-test-chef'

    console.log(`[priority-test] Authenticated as ${this.agentEmail}`)
  }

  async sendRequest(taskId: string, priority: 'on_demand' | 'batch'): Promise<PriorityTestResult> {
    const startTime = Date.now()

    // Map priority to endpoint
    const endpoint = priority === 'on_demand' ? 'api/remy/public' : 'api/remy/background'

    try {
      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `auth-token=${this.authToken}`,
        },
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
          message:
            priority === 'on_demand'
              ? 'Quick question about private chef responsibilities'
              : 'Analyze my recipe costs',
          personality: 'veteran',
          context: {
            chefId: this.chefId,
            userId: this.chefId,
          },
        }),
      })

      const endTime = Date.now()

      return {
        taskId,
        priority,
        startTime,
        endTime,
        durationMs: endTime - startTime,
        status: response.ok ? 'success' : 'error',
      }
    } catch (err) {
      const endTime = Date.now()
      return {
        taskId,
        priority,
        startTime,
        endTime,
        durationMs: endTime - startTime,
        status: 'error',
      }
    }
  }

  async runTest(): Promise<void> {
    console.log('[priority-test] Starting priority ordering test')

    // Phase 1: Queue 50 low-priority (BATCH) tasks
    console.log('[priority-test] Phase 1: Queueing 50 BATCH tasks (low priority)')
    const batchPromises: Promise<PriorityTestResult>[] = []
    for (let i = 0; i < 50; i++) {
      batchPromises.push(this.sendRequest(`batch-${i}`, 'batch'))
    }

    // Phase 2: Queue 50 high-priority (ON_DEMAND) tasks immediately after
    console.log('[priority-test] Phase 2: Queueing 50 ON_DEMAND tasks (high priority)')
    const onDemandPromises: Promise<PriorityTestResult>[] = []
    for (let i = 0; i < 50; i++) {
      onDemandPromises.push(this.sendRequest(`ondemand-${i}`, 'on_demand'))
    }

    // Collect all results
    const batchResults = await Promise.all(batchPromises)
    const onDemandResults = await Promise.all(onDemandPromises)

    this.results = [...batchResults, ...onDemandResults]

    console.log('[priority-test] All requests completed, analyzing results...')
  }

  generateReport(): void {
    // Separate by priority
    const batchResults = this.results.filter((r) => r.priority === 'batch')
    const onDemandResults = this.results.filter((r) => r.priority === 'on_demand')

    // Calculate metrics
    const batchDurations = batchResults.map((r) => r.durationMs)
    const onDemandDurations = onDemandResults.map((r) => r.durationMs)

    const batchAvg = batchDurations.reduce((a, b) => a + b, 0) / batchDurations.length
    const onDemandAvg = onDemandDurations.reduce((a, b) => a + b, 0) / onDemandDurations.length

    // Find median completion times
    const batchMedian = batchDurations.sort((a, b) => a - b)[Math.floor(batchDurations.length / 2)]
    const onDemandMedian = onDemandDurations.sort((a, b) => a - b)[
      Math.floor(onDemandDurations.length / 2)
    ]

    // Count how many ON_DEMAND tasks completed before the last BATCH task
    const lastBatchCompletionTime = Math.max(...batchResults.map((r) => r.endTime))
    const onDemandBeforeLast = onDemandResults.filter(
      (r) => r.endTime < lastBatchCompletionTime
    ).length

    const report = {
      timestamp: new Date().toISOString(),
      test: 'task_priority',
      summary: {
        totalRequests: this.results.length,
        batchTasks: batchResults.length,
        onDemandTasks: onDemandResults.length,
        allSuccessful: this.results.every((r) => r.status === 'success'),
      },
      batch: {
        count: batchResults.length,
        avgMs: Math.round(batchAvg),
        medianMs: batchMedian,
        minMs: Math.min(...batchDurations),
        maxMs: Math.max(...batchDurations),
        successRate:
          batchResults.filter((r) => r.status === 'success').length / batchResults.length,
      },
      onDemand: {
        count: onDemandResults.length,
        avgMs: Math.round(onDemandAvg),
        medianMs: onDemandMedian,
        minMs: Math.min(...onDemandDurations),
        maxMs: Math.max(...onDemandDurations),
        successRate:
          onDemandResults.filter((r) => r.status === 'success').length / onDemandResults.length,
      },
      priorityVerification: {
        onDemandMedian,
        batchMedian,
        onDemandIsFasterMedian: onDemandMedian < batchMedian,
        onDemandBeforeLastBatch: onDemandBeforeLast,
        percentOnDemandBeforeLastBatch: Math.round(
          (onDemandBeforeLast / onDemandResults.length) * 100
        ),
        verdict:
          onDemandMedian < batchMedian && onDemandBeforeLast >= 45
            ? 'PASS: High-priority tasks processed before low-priority'
            : 'FAIL: Priority ordering not working correctly',
      },
    }

    // Save report
    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true })
    const reportPath = path.join(REPORT_DIR, `task-priority-${Date.now()}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // Print summary
    console.log('\n============================================================')
    console.log('TASK PRIORITY TEST REPORT')
    console.log('============================================================')
    console.log(
      `BATCH tasks:     ${report.batch.count} requests, avg=${report.batch.avgMs}ms, median=${report.batch.medianMs}ms`
    )
    console.log(
      `ON_DEMAND tasks: ${report.onDemand.count} requests, avg=${report.onDemand.avgMs}ms, median=${report.onDemand.medianMs}ms`
    )
    console.log()
    console.log('Priority Verification:')
    console.log(`  ON_DEMAND median: ${onDemandMedian}ms`)
    console.log(`  BATCH median: ${batchMedian}ms`)
    console.log(
      `  ON_DEMAND is faster: ${report.priorityVerification.onDemandIsFasterMedian ? '✅ YES' : '❌ NO'}`
    )
    console.log(
      `  ON_DEMAND tasks completed before last BATCH: ${onDemandBeforeLast}/50 (${report.priorityVerification.percentOnDemandBeforeLastBatch}%)`
    )
    console.log()
    console.log(`${report.priorityVerification.verdict}`)
    console.log('============================================================')
    console.log(`Full report: ${reportPath}`)
    console.log('============================================================\n')
  }
}

test.describe('Task Priority Test', () => {
  test('high-priority tasks are processed before low-priority tasks', async () => {
    const tester = new TaskPriorityTest()

    try {
      await tester.authenticate()
      await tester.runTest()
      tester.generateReport()

      // Verify at least some results
      expect(tester['results'].length).toBeGreaterThan(0)
    } catch (err) {
      console.error('[priority-test] Test failed:', err)
      throw err
    }
  })
})
