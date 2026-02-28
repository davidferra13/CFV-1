// AI Observability Metrics — in-memory counters for AI subsystem health
// Pattern: mirrors lib/activity/observability.ts
// No 'use server' — imported by parse-ollama.ts which has 'use server'.

type AiMetricName =
  | 'ai.call.success'
  | 'ai.call.failure'
  | 'ai.call.cache_hit'
  | 'ai.call.repair_attempted'
  | 'ai.call.repair_succeeded'
  | 'ai.call.timeout'
  | 'ai.call.offline'
  | 'ai.fallback.to_formula'

type TierKey = 'fast' | 'standard' | 'complex'

const counters = new Map<AiMetricName, number>()
const latencies: number[] = []
const tierCounts = new Map<TierKey, number>()
export const MAX_LATENCY_SAMPLES = 200

export function incrementAiMetric(metric: AiMetricName, by = 1): void {
  counters.set(metric, (counters.get(metric) || 0) + by)
}

export function recordAiLatency(ms: number): void {
  latencies.push(ms)
  if (latencies.length > MAX_LATENCY_SAMPLES) latencies.shift()
}

export function recordAiTier(tier: TierKey): void {
  tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1)
}

export function resetAiMetrics(): void {
  counters.clear()
  latencies.length = 0
  tierCounts.clear()
}

export function getAiMetrics() {
  const total = (counters.get('ai.call.success') || 0) + (counters.get('ai.call.failure') || 0)
  const cacheHits = counters.get('ai.call.cache_hit') || 0
  const repairs = counters.get('ai.call.repair_attempted') || 0
  const failures = counters.get('ai.call.failure') || 0

  const sorted = [...latencies].sort((a, b) => a - b)
  const avg =
    sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : null
  const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : null

  return {
    counters: Object.fromEntries(counters),
    totalCalls: total,
    avgLatencyMs: avg,
    p95LatencyMs: p95 ?? null,
    cacheHitRate: total > 0 ? Math.round((cacheHits / total) * 100) / 100 : null,
    repairRate: total > 0 ? Math.round((repairs / total) * 100) / 100 : null,
    errorRate: total > 0 ? Math.round((failures / total) * 100) / 100 : null,
    tierDistribution: Object.fromEntries(tierCounts),
  }
}
