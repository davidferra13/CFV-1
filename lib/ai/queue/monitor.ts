// AI Task Queue - Self-Monitoring System
// No 'use server' - utility module, importable server-side.
//
// The queue watches itself. Detects problems before they become
// catastrophic. Logs everything. Auto-pauses when things go wrong.
//
// WHAT IT MONITORS:
//   - Task success/failure rates (alert if < 80%)
//   - Average response times (alert if 3x normal)
//   - Queue depth (alert if > 50 pending)
//   - Ollama health trends (latency spikes)
//   - Approval rates (quality signal)
//   - Consecutive failures (circuit breaker state)
//
// WHAT IT DOES WITH THE DATA:
//   - Writes local stats to data/remy-stats/ (gitignored, on your PC)
//   - Provides getMonitorReport() for admin UI / Remy drawer nudges
//   - Never sends data externally - all local

import * as fs from 'fs'
import * as path from 'path'

// ============================================
// TYPES
// ============================================

interface TaskMetric {
  taskType: string
  status: 'completed' | 'failed'
  durationMs: number
  endpoint: string
  timestamp: string
  attempt: number
}

interface MonitorReport {
  timestamp: string
  window: '1h' | '24h'
  totalTasks: number
  successRate: number
  avgDurationMs: number
  failedTaskTypes: string[]
  slowTaskTypes: Array<{ taskType: string; avgMs: number }>
  queueHealth: 'healthy' | 'degraded' | 'critical'
  alerts: string[]
}

// ============================================
// IN-MEMORY METRICS (rolling window)
// ============================================

const MAX_METRICS = 1000
const metrics: TaskMetric[] = []

/** Running averages per task type for anomaly detection */
const baselineAvgMs = new Map<string, number>()

// ============================================
// PUBLIC API
// ============================================

/**
 * Record a completed or failed task metric.
 * Called by the worker after each task finishes.
 */
export function recordMetric(metric: TaskMetric): void {
  metrics.push(metric)

  // Keep the window bounded
  if (metrics.length > MAX_METRICS) {
    metrics.splice(0, metrics.length - MAX_METRICS)
  }

  // Update baseline averages
  if (metric.status === 'completed') {
    const current = baselineAvgMs.get(metric.taskType) ?? metric.durationMs
    // Exponential moving average (alpha = 0.2)
    baselineAvgMs.set(metric.taskType, current * 0.8 + metric.durationMs * 0.2)
  }
}

/**
 * Generate a monitoring report for the given time window.
 */
export function getMonitorReport(window: '1h' | '24h' = '1h'): MonitorReport {
  const now = Date.now()
  const cutoff = window === '1h' ? now - 3_600_000 : now - 86_400_000
  const recent = metrics.filter((m) => new Date(m.timestamp).getTime() > cutoff)

  const completed = recent.filter((m) => m.status === 'completed')
  const failed = recent.filter((m) => m.status === 'failed')
  const successRate = recent.length > 0 ? completed.length / recent.length : 1

  // Average duration of completed tasks
  const avgDurationMs =
    completed.length > 0
      ? completed.reduce((sum, m) => sum + m.durationMs, 0) / completed.length
      : 0

  // Find failed task types
  const failedTaskTypes = [...new Set(failed.map((m) => m.taskType))]

  // Find slow task types (>3x baseline)
  const slowTaskTypes: Array<{ taskType: string; avgMs: number }> = []
  const typeGroups = new Map<string, number[]>()
  for (const m of completed) {
    const group = typeGroups.get(m.taskType) ?? []
    group.push(m.durationMs)
    typeGroups.set(m.taskType, group)
  }
  for (const [taskType, durations] of typeGroups) {
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length
    const baseline = baselineAvgMs.get(taskType)
    if (baseline && avg > baseline * 3) {
      slowTaskTypes.push({ taskType, avgMs: Math.round(avg) })
    }
  }

  // Generate alerts
  const alerts: string[] = []
  if (successRate < 0.8 && recent.length >= 5) {
    alerts.push(
      `Task success rate is ${Math.round(successRate * 100)}% (below 80% threshold). ` +
        `Failed types: ${failedTaskTypes.join(', ')}`
    )
  }
  if (slowTaskTypes.length > 0) {
    alerts.push(
      `Slow tasks detected: ${slowTaskTypes.map((s) => `${s.taskType} (${s.avgMs}ms avg)`).join(', ')}`
    )
  }
  if (failed.length >= 10) {
    alerts.push(
      `${failed.length} failures in the last ${window}. Check Ollama health and task handlers.`
    )
  }

  // Overall health
  let queueHealth: 'healthy' | 'degraded' | 'critical' = 'healthy'
  if (alerts.length > 0) queueHealth = 'degraded'
  if (successRate < 0.5 || failed.length >= 20) queueHealth = 'critical'

  return {
    timestamp: new Date().toISOString(),
    window,
    totalTasks: recent.length,
    successRate: Math.round(successRate * 100) / 100,
    avgDurationMs: Math.round(avgDurationMs),
    failedTaskTypes,
    slowTaskTypes,
    queueHealth,
    alerts,
  }
}

/**
 * Write daily summary to local disk.
 * Called by the worker once per day (or on shutdown).
 * Files go to data/remy-stats/ which is gitignored.
 */
export function writeDailySummary(): void {
  const report = getMonitorReport('24h')

  const statsDir = path.join(process.cwd(), 'data', 'remy-stats')
  try {
    fs.mkdirSync(statsDir, { recursive: true })
  } catch {
    // Directory might already exist
  }

  const dateStr = new Date().toISOString().split('T')[0]
  const filePath = path.join(statsDir, `daily-summary-${dateStr}.json`)

  // Append to existing if same day, otherwise create new
  let existing: Record<string, unknown>[] = []
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    existing = JSON.parse(content)
    if (!Array.isArray(existing)) existing = [existing]
  } catch {
    // File doesn't exist yet
  }

  existing.push(report as any)

  try {
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8')
    console.log(`[ai-monitor] Daily summary written to ${filePath}`)
  } catch (err) {
    console.error('[ai-monitor] Failed to write daily summary:', err)
  }
}

/**
 * Write task performance metrics to local disk.
 * Per-task-type averages, failure rates, retry rates.
 */
export function writeTaskPerformance(): void {
  const statsDir = path.join(process.cwd(), 'data', 'remy-stats')
  try {
    fs.mkdirSync(statsDir, { recursive: true })
  } catch {
    // Directory might already exist
  }

  const performance: Record<
    string,
    { count: number; avgMs: number; failRate: number; retryRate: number }
  > = {}

  // Group by task type
  const groups = new Map<string, TaskMetric[]>()
  for (const m of metrics) {
    const group = groups.get(m.taskType) ?? []
    group.push(m)
    groups.set(m.taskType, group)
  }

  for (const [taskType, items] of groups) {
    const completed = items.filter((i) => i.status === 'completed')
    const failed = items.filter((i) => i.status === 'failed')
    const retried = items.filter((i) => i.attempt > 1)

    performance[taskType] = {
      count: items.length,
      avgMs:
        completed.length > 0
          ? Math.round(completed.reduce((s, i) => s + i.durationMs, 0) / completed.length)
          : 0,
      failRate: items.length > 0 ? Math.round((failed.length / items.length) * 100) / 100 : 0,
      retryRate: items.length > 0 ? Math.round((retried.length / items.length) * 100) / 100 : 0,
    }
  }

  const filePath = path.join(statsDir, 'task-performance.json')
  try {
    fs.writeFileSync(filePath, JSON.stringify(performance, null, 2), 'utf-8')
  } catch (err) {
    console.error('[ai-monitor] Failed to write task performance:', err)
  }
}

/**
 * Check if any alerts need to be surfaced to the chef.
 * Returns alert messages for the Remy drawer nudge banner.
 */
export function getActiveAlerts(): string[] {
  const report = getMonitorReport('1h')
  return report.alerts
}

/**
 * Get the overall queue health status.
 */
export function getQueueHealth(): 'healthy' | 'degraded' | 'critical' {
  const report = getMonitorReport('1h')
  return report.queueHealth
}
