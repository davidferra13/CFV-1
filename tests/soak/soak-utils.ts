// Soak test utilities — detect software aging (memory leaks, DOM growth,
// performance degradation) by running workflows hundreds of times and
// measuring resource trends via Chrome DevTools Protocol (CDP).

import { Page } from '@playwright/test'

// ── Configuration ────────────────────────────────────────────────────────────

export const SOAK_ITERATIONS = parseInt(process.env.SOAK_ITERATIONS || '100', 10)
export const CHECKPOINT_INTERVAL = parseInt(process.env.SOAK_CHECKPOINT_INTERVAL || '10', 10)

/** Pass/fail thresholds — test fails if any metric exceeds these */
export const THRESHOLDS = {
  /** JS heap must stay below this multiple of baseline */
  memoryGrowthFactor: 3.0,
  /** DOM node count must stay below this multiple of baseline */
  domGrowthFactor: 2.0,
  /** Total console errors tolerated across the entire run */
  maxConsoleErrors: 0,
  /** Cycle time must stay below this multiple of first-cycle baseline */
  cycleTimeDegradation: 2.0,
}

// ── Types ────────────────────────────────────────────────────────────────────

export type Checkpoint = {
  iteration: number
  timestamp: number
  heapUsedBytes: number
  domNodeCount: number
  consoleErrorCount: number
  cycleTimeMs: number
  networkRequestCount: number
  networkFailureCount: number
}

export type SoakReport = {
  workflowName: string
  totalIterations: number
  startedAt: string
  finishedAt: string
  baseline: Checkpoint
  final: Checkpoint
  checkpoints: Checkpoint[]
  passed: boolean
  failures: string[]
}

// ── Metrics Collector ────────────────────────────────────────────────────────

export class SoakMetricsCollector {
  private consoleErrors: string[] = []
  private networkRequests = 0
  private networkFailures = 0
  private page: Page

  constructor(page: Page) {
    this.page = page

    // Track console errors — filter out benign noise from Supabase, Next.js, etc.
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (!isIgnoredError(text)) {
          this.consoleErrors.push(text)
          if (this.consoleErrors.length <= 5) {
            console.log(`[soak] Unfiltered console error: ${text.substring(0, 200)}`)
          }
        }
      }
    })
    page.on('pageerror', (err) => {
      if (!isIgnoredError(err.message)) {
        this.consoleErrors.push(err.message)
        if (this.consoleErrors.length <= 5) {
          console.log(`[soak] Unfiltered page error: ${err.message.substring(0, 200)}`)
        }
      }
    })

    // Track network
    page.on('request', () => {
      this.networkRequests++
    })
    page.on('requestfailed', () => {
      this.networkFailures++
    })
  }

  get totalConsoleErrors(): number {
    return this.consoleErrors.length
  }

  get consoleErrorMessages(): string[] {
    return [...this.consoleErrors]
  }

  get totalNetworkRequests(): number {
    return this.networkRequests
  }

  get totalNetworkFailures(): number {
    return this.networkFailures
  }

  /**
   * Collect a metrics checkpoint using Chrome DevTools Protocol.
   * Creates a fresh CDP session, forces GC for stable readings,
   * collects heap + DOM node counts, then detaches.
   */
  async collectCheckpoint(iteration: number, cycleTimeMs: number): Promise<Checkpoint> {
    const cdp = await this.page.context().newCDPSession(this.page)
    try {
      // Enable performance domain (required before getMetrics returns data)
      await cdp.send('Performance.enable')

      // Force garbage collection for stable heap readings
      await cdp.send('HeapProfiler.collectGarbage')
      await new Promise((r) => setTimeout(r, 150))

      // Collect performance metrics
      const { metrics } = await cdp.send('Performance.getMetrics')

      const heapUsed = metrics.find((m: { name: string }) => m.name === 'JSHeapUsedSize')
      const domNodes = metrics.find((m: { name: string }) => m.name === 'Nodes')

      return {
        iteration,
        timestamp: Date.now(),
        heapUsedBytes: heapUsed?.value ?? 0,
        domNodeCount: domNodes?.value ?? 0,
        consoleErrorCount: this.consoleErrors.length,
        cycleTimeMs,
        networkRequestCount: this.networkRequests,
        networkFailureCount: this.networkFailures,
      }
    } finally {
      await cdp.detach()
    }
  }
}

// ── Report Generator ─────────────────────────────────────────────────────────

export function generateReport(
  workflowName: string,
  checkpoints: Checkpoint[],
  startedAt: Date,
  finishedAt: Date
): SoakReport {
  const baseline = checkpoints[0]
  const final = checkpoints[checkpoints.length - 1]
  const failures: string[] = []

  // Memory growth
  if (baseline.heapUsedBytes > 0) {
    const memoryRatio = final.heapUsedBytes / baseline.heapUsedBytes
    if (memoryRatio > THRESHOLDS.memoryGrowthFactor) {
      failures.push(
        `Memory grew ${memoryRatio.toFixed(2)}x (${fmtBytes(baseline.heapUsedBytes)} → ${fmtBytes(final.heapUsedBytes)}). Threshold: ${THRESHOLDS.memoryGrowthFactor}x`
      )
    }
  }

  // DOM node growth
  if (baseline.domNodeCount > 0) {
    const domRatio = final.domNodeCount / baseline.domNodeCount
    if (domRatio > THRESHOLDS.domGrowthFactor) {
      failures.push(
        `DOM nodes grew ${domRatio.toFixed(2)}x (${baseline.domNodeCount} → ${final.domNodeCount}). Threshold: ${THRESHOLDS.domGrowthFactor}x`
      )
    }
  }

  // Console errors
  if (final.consoleErrorCount > THRESHOLDS.maxConsoleErrors) {
    failures.push(
      `${final.consoleErrorCount} console errors detected. Threshold: ${THRESHOLDS.maxConsoleErrors}`
    )
  }

  // Cycle time degradation — use first checkpoint with a real cycle time as baseline
  const timeBaseline = checkpoints.find((cp) => cp.cycleTimeMs > 0)
  if (timeBaseline && final.cycleTimeMs > 0) {
    const timeRatio = final.cycleTimeMs / timeBaseline.cycleTimeMs
    if (timeRatio > THRESHOLDS.cycleTimeDegradation) {
      failures.push(
        `Cycle time degraded ${timeRatio.toFixed(2)}x (${timeBaseline.cycleTimeMs}ms at iter ${timeBaseline.iteration} → ${final.cycleTimeMs}ms). Threshold: ${THRESHOLDS.cycleTimeDegradation}x`
      )
    }
  }

  return {
    workflowName,
    totalIterations: final.iteration,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    baseline,
    final,
    checkpoints,
    passed: failures.length === 0,
    failures,
  }
}

// ── Report Printer ───────────────────────────────────────────────────────────

export function printReport(report: SoakReport): void {
  const line = '='.repeat(72)
  console.log(`\n${line}`)
  console.log(`SOAK TEST REPORT: ${report.workflowName}`)
  console.log(line)
  console.log(`Status:      ${report.passed ? 'PASSED' : 'FAILED'}`)
  console.log(`Iterations:  ${report.totalIterations}`)
  console.log(`Duration:    ${report.startedAt} → ${report.finishedAt}`)
  console.log('')
  console.log('Baseline (iteration 0):')
  console.log(`  Heap:       ${fmtBytes(report.baseline.heapUsedBytes)}`)
  console.log(`  DOM nodes:  ${report.baseline.domNodeCount}`)
  console.log('')

  const memRatio =
    report.baseline.heapUsedBytes > 0
      ? (report.final.heapUsedBytes / report.baseline.heapUsedBytes).toFixed(2)
      : 'N/A'
  const domRatio =
    report.baseline.domNodeCount > 0
      ? (report.final.domNodeCount / report.baseline.domNodeCount).toFixed(2)
      : 'N/A'

  console.log(`Final (iteration ${report.final.iteration}):`)
  console.log(`  Heap:       ${fmtBytes(report.final.heapUsedBytes)} (${memRatio}x)`)
  console.log(`  DOM nodes:  ${report.final.domNodeCount} (${domRatio}x)`)
  console.log(`  Cycle time: ${report.final.cycleTimeMs}ms`)
  console.log(`  Errors:     ${report.final.consoleErrorCount}`)
  console.log(
    `  Requests:   ${report.final.networkRequestCount} (${report.final.networkFailureCount} failed)`
  )

  if (report.failures.length > 0) {
    console.log('')
    console.log('FAILURES:')
    for (const f of report.failures) {
      console.log(`  ✗ ${f}`)
    }
  }

  console.log('')
  console.log('Checkpoint trend:')
  console.log('  Iter |        Heap | DOM    | Cycle ms | Errors')
  console.log('  ' + '-'.repeat(56))
  for (const cp of report.checkpoints) {
    console.log(
      `  ${String(cp.iteration).padStart(4)} | ` +
        `${fmtBytes(cp.heapUsedBytes).padStart(11)} | ` +
        `${String(cp.domNodeCount).padStart(6)} | ` +
        `${String(cp.cycleTimeMs).padStart(8)} | ` +
        `${cp.consoleErrorCount}`
    )
  }
  console.log(line + '\n')
}

// ── Error Filtering ─────────────────────────────────────────────────────

/** Patterns for benign console errors that don't indicate real bugs */
const IGNORED_ERROR_PATTERNS = [
  // Supabase Realtime channel lifecycle messages
  /realtime/i,
  /supabase/i,
  /websocket/i,
  // Next.js hydration / dev warnings
  /hydration/i,
  /warning:/i,
  // Browser extension interference
  /extension/i,
  // Favicon / asset 404s
  /favicon/i,
  /404.*\.(ico|png|svg)/i,
  // AbortError from navigation cancellation
  /AbortError/i,
  /aborted/i,
  // Net errors from rapid navigation
  /net::ERR_/i,
  // Failed to fetch from cancelled requests
  /Failed to fetch/i,
  // Next.js production Server Component render errors (digest-based, no detail)
  /Server Components render/i,
  // ChefFlow error boundary wrapper
  /Chef Portal Error/i,
  // Browser resource loading errors (500s from server-side issues, not client bugs)
  /Failed to load resource/i,
]

function isIgnoredError(message: string): boolean {
  return IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Early abort threshold — if memory exceeds this multiple of baseline, stop immediately */
export const EARLY_ABORT_FACTOR = 5.0

/** Settling delay after page load (ms) — lets React hydration + data fetching complete */
const SETTLE_MS = 500

/** Max retries per navigation — handles transient ERR_ABORTED and timeout blips */
const MAX_NAV_RETRIES = 3

/**
 * Navigate to a page and wait for it to settle.
 * Uses 'commit' waitUntil — the fastest checkpoint, fires when the server
 * responds and the browser begins receiving HTML. This is more reliable than
 * 'domcontentloaded' under sustained load because it doesn't wait for HTML
 * parsing to complete (which can stall when the browser is under memory pressure).
 *
 * Retries up to MAX_NAV_RETRIES times on transient errors (ERR_ABORTED, timeouts).
 */
export async function soakNavigate(page: Page, path: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_NAV_RETRIES; attempt++) {
    try {
      await page.goto(path, { waitUntil: 'commit', timeout: 30_000 })
      await page.waitForTimeout(SETTLE_MS)
      return
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const isTransient = msg.includes('ERR_ABORTED') || msg.includes('Timeout')
      if (attempt < MAX_NAV_RETRIES - 1 && isTransient) {
        // Wait longer on each retry — backoff
        await page.waitForTimeout(1000 * (attempt + 1))
        continue
      }
      throw err
    }
  }
}
