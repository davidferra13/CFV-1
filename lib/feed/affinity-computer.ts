async function db() {
  const { pgClient } = await import('@/lib/db')
  return pgClient
}

export interface SourceAffinity {
  source: string
  actRate: number
  affinityScore: number
  actionCount: number
  totalCount: number
}

const POSITIVE_ACTIONS = new Set(['act', 'save', 'click'])
const NEGATIVE_ACTIONS = new Set(['dismiss'])

const DEFAULT_AFFINITY = 50
const FLOOR_AFFINITY = 10
const CAP_AFFINITY = 95
const EMA_ALPHA = 0.1

export async function computeSourceAffinity(
  tenantId: string,
  userId: string,
  lookbackDays: number = 30
): Promise<Map<string, number>> {
  const pgClient = await db()

  const rows = await pgClient`
    SELECT
      item_source,
      action_type,
      DATE(created_at) as action_date,
      COUNT(*)::int as cnt
    FROM rail_engagement_log
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND created_at > NOW() - ${lookbackDays + ' days'}::interval
    GROUP BY item_source, action_type, DATE(created_at)
    ORDER BY item_source, action_date ASC
  `

  // Group by source, then compute EMA over daily buckets
  const sourceData = new Map<
    string,
    Array<{ date: string; positive: number; negative: number; neutral: number }>
  >()

  for (const row of rows) {
    const source = row.item_source as string
    const actionType = row.action_type as string
    const date = String(row.action_date)
    const count = row.cnt as number

    if (!sourceData.has(source)) {
      sourceData.set(source, [])
    }

    const buckets = sourceData.get(source)!
    let bucket = buckets.find((b) => b.date === date)
    if (!bucket) {
      bucket = { date, positive: 0, negative: 0, neutral: 0 }
      buckets.push(bucket)
    }

    if (POSITIVE_ACTIONS.has(actionType)) {
      bucket.positive += count
    } else if (NEGATIVE_ACTIONS.has(actionType)) {
      bucket.negative += count
    } else {
      bucket.neutral += count
    }
  }

  const result = new Map<string, number>()

  for (const [source, buckets] of sourceData) {
    // Sort by date ascending for EMA
    buckets.sort((a, b) => a.date.localeCompare(b.date))

    let ema = 0.5 // start at neutral
    for (const bucket of buckets) {
      const total = bucket.positive + bucket.negative + bucket.neutral
      if (total === 0) continue
      const dailyRate = bucket.positive / total
      ema = EMA_ALPHA * dailyRate + (1 - EMA_ALPHA) * ema
    }

    // Scale to 0-100 and clamp
    const score = Math.max(FLOOR_AFFINITY, Math.min(CAP_AFFINITY, Math.round(ema * 100)))
    result.set(source, score)
  }

  return result
}

export async function getAffinityBoost(
  tenantId: string,
  userId: string,
  source: string
): Promise<number> {
  const affinities = await computeSourceAffinity(tenantId, userId)
  return affinities.get(source) ?? DEFAULT_AFFINITY
}
