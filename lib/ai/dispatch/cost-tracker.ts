// AI Dispatch Layer - Cost Tracker
// No 'use server' - pure utility, importable anywhere server-side.
//
// Tracks per-provider, per-task-class metrics for the dispatch system.
// This is separate from ai-metrics.ts (which tracks raw call counts).
// The cost tracker adds dispatch-level context: which task class triggered
// the call, which provider handled it, whether fallbacks were used.
//
// Data is in-memory (resets on server restart). For persistent tracking,
// a future phase can flush to the database or an external service.

import type { TaskClass, DispatchProvider } from './types'

// ============================================
// TYPES
// ============================================

interface DispatchEvent {
  taskClass: TaskClass
  provider: DispatchProvider
  chainPosition: number // 0 = primary, 1 = secondary, 2 = fallback
  latencyMs: number
  success: boolean
  timestamp: number
}

interface ProviderStats {
  calls: number
  successes: number
  failures: number
  totalLatencyMs: number
  fallbacksUsed: number // Times this provider was a fallback (chainPosition > 0)
}

interface TaskClassStats {
  calls: number
  avgLatencyMs: number
  primaryHitRate: number // % of calls handled by primary provider
  providerBreakdown: Record<string, number> // provider -> count
}

// ============================================
// STATE
// ============================================

const events: DispatchEvent[] = []
const MAX_EVENTS = 1000 // Rolling window

// ============================================
// RECORDING
// ============================================

/**
 * Record a dispatch event. Called by the router after every dispatch.
 */
export function recordDispatchEvent(event: Omit<DispatchEvent, 'timestamp'>): void {
  events.push({ ...event, timestamp: Date.now() })
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS)
  }
}

// ============================================
// QUERIES
// ============================================

/**
 * Get stats per provider.
 */
export function getProviderStats(): Record<string, ProviderStats> {
  const stats: Record<string, ProviderStats> = {}

  for (const event of events) {
    const key = event.provider
    if (!stats[key]) {
      stats[key] = { calls: 0, successes: 0, failures: 0, totalLatencyMs: 0, fallbacksUsed: 0 }
    }
    stats[key].calls++
    if (event.success) stats[key].successes++
    else stats[key].failures++
    stats[key].totalLatencyMs += event.latencyMs
    if (event.chainPosition > 0) stats[key].fallbacksUsed++
  }

  return stats
}

/**
 * Get stats per task class.
 */
export function getTaskClassStats(): Record<string, TaskClassStats> {
  const grouped: Record<string, DispatchEvent[]> = {}

  for (const event of events) {
    if (!grouped[event.taskClass]) grouped[event.taskClass] = []
    grouped[event.taskClass].push(event)
  }

  const stats: Record<string, TaskClassStats> = {}
  for (const [taskClass, classEvents] of Object.entries(grouped)) {
    const totalLatency = classEvents.reduce((sum, e) => sum + e.latencyMs, 0)
    const primaryHits = classEvents.filter((e) => e.chainPosition === 0).length

    const providerBreakdown: Record<string, number> = {}
    for (const e of classEvents) {
      providerBreakdown[e.provider] = (providerBreakdown[e.provider] || 0) + 1
    }

    stats[taskClass] = {
      calls: classEvents.length,
      avgLatencyMs: Math.round(totalLatency / classEvents.length),
      primaryHitRate: Math.round((primaryHits / classEvents.length) * 100) / 100,
      providerBreakdown,
    }
  }

  return stats
}

/**
 * Get a summary report suitable for logging or display.
 */
export function getDispatchSummary(): {
  totalDispatches: number
  successRate: number
  fallbackRate: number
  providerStats: Record<string, ProviderStats>
  taskClassStats: Record<string, TaskClassStats>
  recentFailures: Array<{ taskClass: string; provider: string; timestamp: number }>
} {
  const successes = events.filter((e) => e.success).length
  const fallbacks = events.filter((e) => e.chainPosition > 0).length
  const total = events.length

  const recentFailures = events
    .filter((e) => !e.success)
    .slice(-10)
    .map((e) => ({
      taskClass: e.taskClass,
      provider: e.provider,
      timestamp: e.timestamp,
    }))

  return {
    totalDispatches: total,
    successRate: total > 0 ? Math.round((successes / total) * 100) / 100 : 1,
    fallbackRate: total > 0 ? Math.round((fallbacks / total) * 100) / 100 : 0,
    providerStats: getProviderStats(),
    taskClassStats: getTaskClassStats(),
    recentFailures,
  }
}

/**
 * Reset all tracked events. Used in tests.
 */
export function resetDispatchTracking(): void {
  events.length = 0
}

/**
 * Get raw event count (for health checks).
 */
export function getDispatchEventCount(): number {
  return events.length
}
