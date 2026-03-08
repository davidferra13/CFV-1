type StageSnapshot = {
  count: number
  totalMs: number
  maxMs: number
  samples: number[]
}

const stageStore = new Map<string, StageSnapshot>()
const MAX_STAGE_SAMPLES = 120

export async function timeRemyStage<T>(
  stageLatencies: Record<string, number>,
  stageName: string,
  work: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now()
  try {
    return await work()
  } finally {
    stageLatencies[stageName] = Date.now() - startedAt
  }
}

export function recordRemyStageBatch(stageLatencies: Record<string, number>): void {
  for (const [stage, durationMs] of Object.entries(stageLatencies)) {
    const safeDuration = Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs)) : 0
    const existing = stageStore.get(stage) ?? {
      count: 0,
      totalMs: 0,
      maxMs: 0,
      samples: [],
    }
    existing.count += 1
    existing.totalMs += safeDuration
    existing.maxMs = Math.max(existing.maxMs, safeDuration)
    existing.samples.push(safeDuration)
    if (existing.samples.length > MAX_STAGE_SAMPLES) existing.samples.shift()
    stageStore.set(stage, existing)
  }
}

export function getRemyStageMetrics(): Record<
  string,
  { count: number; avgMs: number; p95Ms: number | null; maxMs: number }
> {
  const result: Record<
    string,
    { count: number; avgMs: number; p95Ms: number | null; maxMs: number }
  > = {}

  for (const [stage, snapshot] of stageStore.entries()) {
    const sorted = [...snapshot.samples].sort((a, b) => a - b)
    result[stage] = {
      count: snapshot.count,
      avgMs: snapshot.count > 0 ? Math.round(snapshot.totalMs / snapshot.count) : 0,
      p95Ms: sorted.length > 0 ? sorted[Math.floor((sorted.length - 1) * 0.95)] : null,
      maxMs: snapshot.maxMs,
    }
  }

  return result
}

export function resetRemyStageMetrics(): void {
  stageStore.clear()
}
