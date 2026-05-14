export type DiscoveryAnalyticsRow = {
  algorithm_version: string | null
  row_role: string | null
  item_type: string | null
  item_value: string | null
  destination_path: string | null
  action: string | null
  created_at?: string | null
}

export type DiscoveryAnalyticsMetric = {
  key: string
  algorithmVersion: string
  rowRole: string
  itemType: string
  itemValue: string
  destinationPath: string
  impressions: number
  clicks: number
  longDwells: number
  quickBacks: number
  inquiryStarts: number
  inquirySubmits: number
  bookings: number
  clickThroughRate: number
  quickBackRate: number
  longDwellRate: number
  conversionRate: number
}

export type DiscoveryPruningDecision = {
  key: string
  action: 'keep' | 'demote' | 'investigate' | 'protect'
  reason: string
}

export function aggregateDiscoveryAnalytics(
  rows: DiscoveryAnalyticsRow[]
): DiscoveryAnalyticsMetric[] {
  const grouped = new Map<string, DiscoveryAnalyticsMetric>()

  for (const row of rows) {
    const algorithmVersion = clean(row.algorithm_version, 'unknown')
    const rowRole = clean(row.row_role, 'unknown')
    const itemType = clean(row.item_type, 'unknown')
    const itemValue = clean(row.item_value, 'unknown')
    const destinationPath = clean(row.destination_path, 'unknown')
    const key = [algorithmVersion, rowRole, itemType, itemValue, destinationPath].join('|')
    const metric =
      grouped.get(key) ??
      ({
        key,
        algorithmVersion,
        rowRole,
        itemType,
        itemValue,
        destinationPath,
        impressions: 0,
        clicks: 0,
        longDwells: 0,
        quickBacks: 0,
        inquiryStarts: 0,
        inquirySubmits: 0,
        bookings: 0,
        clickThroughRate: 0,
        quickBackRate: 0,
        longDwellRate: 0,
        conversionRate: 0,
      } satisfies DiscoveryAnalyticsMetric)

    const action = clean(row.action, 'click')
    if (action === 'impression') metric.impressions += 1
    if (action === 'click') metric.clicks += 1
    if (action === 'long_dwell') metric.longDwells += 1
    if (action === 'quick_back') metric.quickBacks += 1
    if (action === 'inquiry_started') metric.inquiryStarts += 1
    if (action === 'inquiry_submitted') metric.inquirySubmits += 1
    if (action === 'book' || action === 'booking') metric.bookings += 1

    grouped.set(key, metric)
  }

  return Array.from(grouped.values()).map((metric) => {
    const exposures = Math.max(metric.impressions, metric.clicks)
    const clicks = Math.max(metric.clicks, 1)
    return {
      ...metric,
      clickThroughRate: round(metric.clicks / Math.max(exposures, 1)),
      quickBackRate: round(metric.quickBacks / clicks),
      longDwellRate: round(metric.longDwells / clicks),
      conversionRate: round((metric.inquirySubmits + metric.bookings) / clicks),
    }
  })
}

export function evaluateDiscoveryPruning(
  metrics: DiscoveryAnalyticsMetric[],
  options: { minimumImpressions?: number; protectedItemTypes?: string[] } = {}
): DiscoveryPruningDecision[] {
  const minimumImpressions = options.minimumImpressions ?? 50
  const protectedTypes = new Set(options.protectedItemTypes ?? ['saved', 'featured_chef', 'circle'])

  return metrics.map((metric) => {
    if (protectedTypes.has(metric.itemType)) {
      return {
        key: metric.key,
        action: 'protect',
        reason: 'Protected fallback or strategic item type.',
      }
    }
    if (metric.impressions < minimumImpressions) {
      return { key: metric.key, action: 'investigate', reason: 'Insufficient traffic for pruning.' }
    }
    if (metric.clickThroughRate < 0.01 && metric.longDwellRate < 0.05) {
      return { key: metric.key, action: 'demote', reason: 'Low click-through and low dwell.' }
    }
    if (metric.quickBackRate > 0.45 && metric.conversionRate === 0) {
      return {
        key: metric.key,
        action: 'investigate',
        reason: 'High quick-back with no downstream conversion.',
      }
    }
    return { key: metric.key, action: 'keep', reason: 'Performance is within review thresholds.' }
  })
}

function clean(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed || fallback
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
