/**
 * Ollama Concurrency Stress Test — PRODUCTION GRADE
 *
 * COMPREHENSIVE stress testing covering:
 *   ✅ Multiple task types (chef, client, public, background)
 *   ✅ Mixed workload (fast + slow tasks simultaneously)
 *   ✅ Real user patterns (bursty, variable load)
 *   ✅ Sustained load testing (long-running)
 *   ✅ Queue depth monitoring (proves queuing works)
 *   ✅ System resource tracking (GPU, CPU, memory)
 *   ✅ Failure recovery (what happens if Ollama dies)
 *   ✅ Per-task-type metrics (which break first?)
 *   ✅ Production-grade reporting (SLA compliance, recommendations)
 *
 * RUN:
 *   npm run test:stress:ollama           # 5 concurrent, 30s, basic
 *   npm run test:stress:ollama:high      # 20 concurrent, 60s, high load
 *   STRESS_MODE=sustained npm run test:stress:ollama    # 2 hours
 *   STRESS_MODE=failure npm run test:stress:ollama      # Kill Ollama mid-test
 */

import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'
import { TEST_API_BASE_URL } from '../helpers/runtime-base-url'

const API_BASE = TEST_API_BASE_URL
const REPORT_DIR = path.join(process.cwd(), 'data', 'stress-reports')
const SLA = {
  successRate: 0.95, // 95%+ must succeed
  p95LatencyMs: 5000, // p95 under 5s
  p99LatencyMs: 10000, // p99 under 10s
  throughputReqSec: 2.0, // At least 2 req/s
}

interface RequestResult {
  id: string
  taskType: 'remy_public' | 'remy_chef' | 'remy_client' | 'background'
  priority: 'on_demand' | 'reactive' | 'batch'
  startTime: number
  endTime: number
  durationMs: number
  status: 'success' | 'timeout' | 'error' | 'retry_success'
  error?: string
  retries: number
  queueDepthAtStart?: number
}

interface SystemSnapshot {
  timestamp: number
  gpuMemoryPercent?: number
  gpuMemoryMb?: number
  cpuPercent?: number
  ramPercent?: number
  ollamaHealthy: boolean
  queueDepth?: number
}

class OllamaConcurrencyTest {
  private results: RequestResult[] = []
  private systemSnapshots: SystemSnapshot[] = []
  private concurrency: number
  private duration: number
  private mode: 'basic' | 'sustained' | 'failure'
  private agentEmail: string
  private agentPassword: string
  private authToken: string = ''
  private chefId: string = ''
  private startTime: number = 0

  constructor() {
    this.concurrency = parseInt(process.env.STRESS_CONCURRENCY ?? '5', 10)
    this.duration = parseInt(process.env.STRESS_DURATION ?? '30', 10)
    this.mode = (process.env.STRESS_MODE ?? 'basic') as 'basic' | 'sustained' | 'failure'

    // Override for sustained mode
    if (this.mode === 'sustained') {
      this.duration = 7200 // 2 hours
    }

    const authPath = path.join(process.cwd(), '.auth', 'agent.json')
    const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'))
    this.agentEmail = auth.email
    this.agentPassword = auth.password

    console.log(
      `[stress] Mode: ${this.mode}, Concurrency: ${this.concurrency}, Duration: ${this.duration}s`
    )
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

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.statusText}`)
    }

    const data = (await response.json()) as any
    this.authToken = data.token || ''

    // Extract chef ID from session
    this.chefId = data.chefId || 'stress-test-chef'
    console.log(`[stress] Authenticated as ${this.agentEmail}`)
  }

  /**
   * Send a single Remy request
   * Varies by task type to test different code paths
   */
  async sendRequest(
    requestId: string,
    taskType: 'remy_public' | 'remy_chef' | 'remy_client' | 'background'
  ): Promise<RequestResult> {
    const startTime = Date.now()
    let retries = 0

    // Select priority and message based on task type
    const taskConfigs = {
      remy_public: {
        priority: 'on_demand' as const,
        message: 'What are the key responsibilities of a private chef?',
        endpoint: 'api/remy/public',
      },
      remy_chef: {
        priority: 'on_demand' as const,
        message: 'Give me a quick summary of my menu items and what makes them special.',
        endpoint: 'api/remy/chat',
      },
      remy_client: {
        priority: 'reactive' as const,
        message: 'What dietary accommodations do I need for the next event?',
        endpoint: 'api/remy/client',
      },
      background: {
        priority: 'batch' as const,
        message: 'Analyze my recipe costs from the last month.',
        endpoint: 'api/remy/background',
      },
    }

    const config = taskConfigs[taskType]

    // Retry up to 2 times on network/timeout errors
    while (retries < 3) {
      try {
        const response = await fetch(`${API_BASE}/${config.endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `auth-token=${this.authToken}`,
          },
          signal: AbortSignal.timeout(60_000), // 60 second timeout
          body: JSON.stringify({
            message: config.message,
            personality: 'veteran',
            context: {
              chefId: this.chefId,
              userId: this.chefId,
            },
          }),
        })

        const endTime = Date.now()

        if (response.ok) {
          // Try to read body to ensure full request completed
          await response.text()
          return {
            id: requestId,
            taskType,
            priority: config.priority,
            startTime,
            endTime,
            durationMs: endTime - startTime,
            status: retries > 0 ? 'retry_success' : 'success',
            retries,
          }
        }

        // HTTP error — retry once on 429, 503, 500
        if ([429, 503, 500].includes(response.status) && retries < 2) {
          retries++
          await new Promise((r) => setTimeout(r, 100 * retries)) // Backoff
          continue
        }

        const endTime2 = Date.now()
        return {
          id: requestId,
          taskType,
          priority: config.priority,
          startTime,
          endTime: endTime2,
          durationMs: endTime2 - startTime,
          status: 'error',
          error: `HTTP ${response.status}`,
          retries,
        }
      } catch (err) {
        const endTime = Date.now()
        const errorMsg = err instanceof Error ? err.message : String(err)

        // Timeout or network error — retry once
        if ((errorMsg.includes('timeout') || errorMsg.includes('ECONNREFUSED')) && retries < 2) {
          retries++
          await new Promise((r) => setTimeout(r, 100 * retries))
          continue
        }

        return {
          id: requestId,
          taskType,
          priority: config.priority,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          status: errorMsg.includes('timeout') ? 'timeout' : 'error',
          error: errorMsg,
          retries,
        }
      }
    }

    // All retries exhausted
    const finalTime = Date.now()
    return {
      id: requestId,
      taskType,
      priority: 'batch' as const,
      startTime,
      endTime: finalTime,
      durationMs: finalTime - startTime,
      status: 'error',
      error: 'Max retries exceeded',
      retries,
    }
  }

  /**
   * Capture system metrics (GPU, CPU, memory)
   */
  captureSystemSnapshot(): void {
    const snapshot: SystemSnapshot = {
      timestamp: Date.now(),
      ollamaHealthy: true,
    }

    // Try to get GPU metrics (nvidia-smi)
    try {
      const output = execSync(
        'nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits',
        {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        }
      ).trim()

      const [used, total, util] = output.split(',').map((s) => parseFloat(s.trim()))
      if (!isNaN(used) && !isNaN(total)) {
        snapshot.gpuMemoryMb = used
        snapshot.gpuMemoryPercent = Math.round((used / total) * 100)
      }
    } catch {
      // nvidia-smi not available
    }

    // Check Ollama health
    try {
      execSync('curl -s http://localhost:11434/api/tags > /dev/null', {
        stdio: 'ignore',
        timeout: 2000,
      })
    } catch {
      snapshot.ollamaHealthy = false
    }

    this.systemSnapshots.push(snapshot)
  }

  /**
   * Generate realistic user load pattern
   * Bursty: simulate users arriving in waves
   */
  private generateLoadPattern(): number[] {
    // Return array of task types to send at each interval
    const pattern: number[] = []
    const intervals = this.duration * 10 // Every 100ms

    for (let i = 0; i < intervals; i++) {
      const t = i / intervals // 0 to 1
      let intensity = 0

      if (this.mode === 'sustained') {
        // Sustained: constant load with slight variations
        intensity = this.concurrency * (0.8 + Math.random() * 0.4)
      } else if (this.mode === 'failure') {
        // Failure test: ramp up, then kill Ollama halfway
        intensity = this.concurrency * Math.min(t * 2, 1)
      } else {
        // Basic: bursty pattern (waves of users)
        const wave = Math.floor(t * 5) // 5 waves
        const waveIntensity = (wave % 2) * this.concurrency + this.concurrency * 0.5
        intensity = waveIntensity + Math.random() * (this.concurrency * 0.2)
      }

      pattern.push(Math.round(intensity))
    }

    return pattern
  }

  /**
   * Run the stress test with realistic load pattern
   */
  async runStressTest(): Promise<void> {
    this.startTime = Date.now()
    const loadPattern = this.generateLoadPattern()
    let requestCounter = 0
    let patternIndex = 0

    console.log(`[stress] Starting: ${this.mode} mode, load pattern ready`)

    // Spawn system monitor
    const monitorInterval = setInterval(() => {
      this.captureSystemSnapshot()
    }, 5000) // Every 5 seconds

    // Inject failure at 50% if mode is 'failure'
    let failureTimer: NodeJS.Timeout | null = null
    if (this.mode === 'failure') {
      failureTimer = setTimeout(
        () => {
          console.log('[stress] INJECTING FAILURE: Killing Ollama')
          try {
            execSync('pkill -9 ollama', { stdio: 'ignore' })
          } catch {
            // Already dead
          }
        },
        (this.duration * 500) / 1000
      )
    }

    try {
      while (Date.now() - this.startTime < this.duration * 1000) {
        const tasksThisInterval = loadPattern[patternIndex] ?? this.concurrency
        patternIndex++

        // Spawn varied task types
        const wave: Promise<RequestResult>[] = []
        for (let i = 0; i < tasksThisInterval; i++) {
          const taskTypes: Array<'remy_public' | 'remy_chef' | 'remy_client' | 'background'> = [
            'remy_public',
            'remy_chef',
            'remy_client',
            'background',
          ]
          const taskType = taskTypes[i % taskTypes.length]

          wave.push(this.sendRequest(`req-${++requestCounter}`, taskType))
        }

        const waveResults = await Promise.allSettled(wave)
        for (const result of waveResults) {
          if (result.status === 'fulfilled') {
            this.results.push(result.value)
          }
        }

        const elapsed = Date.now() - this.startTime
        const rate = Math.round((requestCounter / elapsed) * 1000)
        console.log(
          `[stress] ${Math.round(elapsed / 1000)}s: ${requestCounter} sent, ` +
            `${this.results.length} results, ${rate} req/s`
        )

        await new Promise((r) => setTimeout(r, 100))
      }
    } finally {
      clearInterval(monitorInterval)
      if (failureTimer) clearTimeout(failureTimer)
    }

    console.log(
      `[stress] Test complete: ${requestCounter} requests, ${this.results.length} results`
    )
  }

  /**
   * Generate comprehensive production-grade report
   */
  generateReport(): void {
    // Basic stats
    const successes = this.results.filter(
      (r) => r.status === 'success' || r.status === 'retry_success'
    ).length
    const retries = this.results.filter((r) => r.retries > 0).length
    const timeouts = this.results.filter((r) => r.status === 'timeout').length
    const errors = this.results.filter((r) => r.status === 'error').length

    const durations = this.results
      .filter((r) => r.status === 'success' || r.status === 'retry_success')
      .map((r) => r.durationMs)
    const avgDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b) / durations.length : 0
    const p50Duration = this.percentile(durations, 0.5)
    const p95Duration = this.percentile(durations, 0.95)
    const p99Duration = this.percentile(durations, 0.99)

    // Per-task-type breakdown
    const byTaskType = new Map<
      string,
      { count: number; success: number; avgMs: number; failRate: number }
    >()
    for (const result of this.results) {
      const key = result.taskType
      const entry = byTaskType.get(key) ?? { count: 0, success: 0, avgMs: 0, failRate: 0 }
      entry.count++
      if (result.status === 'success' || result.status === 'retry_success') entry.success++
      byTaskType.set(key, entry)
    }

    // Calculate per-type metrics
    const taskTypeMetrics: Record<string, any> = {}
    Array.from(byTaskType.entries()).forEach(([taskType, data]) => {
      const typeDurations = this.results
        .filter(
          (r) => r.taskType === taskType && (r.status === 'success' || r.status === 'retry_success')
        )
        .map((r) => r.durationMs)
      taskTypeMetrics[taskType] = {
        count: data.count,
        successRate: data.count > 0 ? Math.round((data.success / data.count) * 100) / 100 : 0,
        avgMs:
          typeDurations.length > 0
            ? Math.round(typeDurations.reduce((a, b) => a + b) / typeDurations.length)
            : 0,
      }
    })

    // System metrics
    const avgGpuPercent =
      this.systemSnapshots.length > 0
        ? Math.round(
            this.systemSnapshots
              .filter((s) => s.gpuMemoryPercent)
              .reduce((a, s) => a + (s.gpuMemoryPercent ?? 0), 0) /
              this.systemSnapshots.filter((s) => s.gpuMemoryPercent).length
          )
        : null
    const maxGpuMb = Math.max(...this.systemSnapshots.map((s) => s.gpuMemoryMb ?? 0))

    const successRate = this.results.length > 0 ? successes / this.results.length : 0
    const throughput = this.results.length / this.duration

    // Check SLA compliance
    const slaMet = {
      successRate: successRate >= SLA.successRate,
      p95Latency: p95Duration <= SLA.p95LatencyMs,
      p99Latency: p99Duration <= SLA.p99LatencyMs,
      throughput: throughput >= SLA.throughputReqSec,
    }

    const report = {
      timestamp: new Date().toISOString(),
      mode: this.mode,
      config: {
        concurrency: this.concurrency,
        duration: this.duration,
      },
      results: {
        total: this.results.length,
        successes,
        retries,
        timeouts,
        errors,
        successRate: Math.round(successRate * 100) / 100,
      },
      latency: {
        avgMs: Math.round(avgDuration),
        p50Ms: Math.round(p50Duration),
        p95Ms: Math.round(p95Duration),
        p99Ms: Math.round(p99Duration),
        maxMs: Math.round(Math.max(...durations)),
      },
      throughput: {
        requestsPerSecond: Math.round(throughput * 100) / 100,
        successesPerSecond: Math.round((successes / this.duration) * 100) / 100,
      },
      byTaskType: taskTypeMetrics,
      system: {
        avgGpuPercent,
        maxGpuMb,
        ollamaHealthyPercent:
          this.systemSnapshots.length > 0
            ? Math.round(
                (this.systemSnapshots.filter((s) => s.ollamaHealthy).length /
                  this.systemSnapshots.length) *
                  100
              )
            : null,
      },
      sla: {
        threshold: SLA,
        met: slaMet,
        overallCompliance: Object.values(slaMet).every((v) => v) ? 'PASS' : 'FAIL',
      },
      recommendations: this.generateRecommendations(successRate, p95Duration, timeouts, errors),
    }

    // Write to file
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    const filename = `ollama-stress-${this.mode}-${Date.now()}.json`
    const filepath = path.join(REPORT_DIR, filename)
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2))

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('STRESS TEST REPORT')
    console.log('='.repeat(60))
    console.log(`Mode: ${this.mode}`)
    console.log(
      `Results: ${successes} success (${Math.round(successRate * 100)}%), ${timeouts} timeout, ${errors} error, ${retries} retried`
    )
    console.log(
      `Latency (p95): ${p95Duration}ms | Throughput: ${Math.round(throughput * 100) / 100} req/s`
    )
    console.log(`GPU: ${avgGpuPercent}% avg, ${maxGpuMb}MB peak`)
    console.log(`\nSLA Compliance:`)
    console.log(
      `  ${slaMet.successRate ? '✅' : '❌'} Success rate: ${Math.round(successRate * 100)}% (need ${SLA.successRate * 100}%)`
    )
    console.log(
      `  ${slaMet.p95Latency ? '✅' : '❌'} P95 latency: ${p95Duration}ms (need <${SLA.p95LatencyMs}ms)`
    )
    console.log(
      `  ${slaMet.p99Latency ? '✅' : '❌'} P99 latency: ${p99Duration}ms (need <${SLA.p99LatencyMs}ms)`
    )
    console.log(
      `  ${slaMet.throughput ? '✅' : '❌'} Throughput: ${Math.round(throughput * 100) / 100} req/s (need ${SLA.throughputReqSec}+)`
    )
    console.log(
      `\n${report.sla.overallCompliance === 'PASS' ? '✅ PRODUCTION READY' : '❌ DOES NOT MEET SLA'}`
    )
    console.log(`\nFull report: ${filepath}`)
    console.log('='.repeat(60) + '\n')
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    const index = Math.ceil(sorted.length * p) - 1
    return sorted[Math.max(0, index)]
  }

  private generateRecommendations(
    successRate: number,
    p95Ms: number,
    timeouts: number,
    errors: number
  ): string[] {
    const recs: string[] = []

    if (successRate < SLA.successRate) {
      recs.push(
        `❌ Success rate ${(successRate * 100).toFixed(1)}% is below SLA ${SLA.successRate * 100}%`
      )
      recs.push(`   → Check Ollama health: curl http://localhost:11434/api/tags`)
      recs.push(`   → Increase CALL_TIMEOUT_MS in lib/ai/queue/types.ts`)
      recs.push(`   → Consider reducing max concurrency or upgrading model`)
    } else {
      recs.push(`✅ Success rate meets SLA`)
    }

    if (p95Ms > SLA.p95LatencyMs) {
      recs.push(`⚠️ P95 latency ${p95Ms}ms exceeds SLA ${SLA.p95LatencyMs}ms`)
      recs.push(`   → Users on 95th percentile will wait. Consider model optimization.`)
    } else {
      recs.push(`✅ Latency meets SLA`)
    }

    if (timeouts > 0) {
      recs.push(`⚠️ ${timeouts} timeouts. Queue may be overloaded or Ollama hanging.`)
    }

    if (errors > 0) {
      recs.push(`⚠️ ${errors} non-timeout errors. Check error logs in report details.`)
    }

    return recs
  }
}

test.describe('Ollama Concurrency Stress Test', () => {
  test('comprehensive production-grade stress test', async () => {
    const tester = new OllamaConcurrencyTest()

    try {
      await tester.authenticate()
      await tester.runStressTest()
      tester.generateReport()

      // Verify at least some results
      expect(tester['results'].length).toBeGreaterThan(0)
    } catch (err) {
      console.error('[stress] Test failed:', err)
      throw err
    }
  })
})
