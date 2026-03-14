export type VendorPricePoint = {
  vendor_id: string
  vendor_name: string | null
  item_name: string
  unit: string
  price_cents: number
  recorded_at: string
}

export type VendorPriceAlert = {
  key: string
  vendor_id: string
  vendor_name: string | null
  item_name: string
  unit: string
  current_price_cents: number
  previous_price_cents: number
  delta_cents: number
  delta_percent: number
  direction: 'up' | 'down'
  changed_at: string
}

export type VendorPriceTrend = {
  key: string
  vendor_id: string
  vendor_name: string | null
  item_name: string
  unit: string
  points: Array<{ recorded_at: string; price_cents: number }>
  latest_price_cents: number
  previous_price_cents: number | null
  direction: 'up' | 'down' | 'flat'
  change_percent: number | null
}

function normalizeKeyToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function groupKey(point: Pick<VendorPricePoint, 'vendor_id' | 'item_name' | 'unit'>): string {
  return `${point.vendor_id}|${normalizeKeyToken(point.item_name)}|${normalizeKeyToken(point.unit)}`
}

function toIso(value: string): string {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date(0).toISOString()
}

export function computeVendorPriceAlerts(
  points: VendorPricePoint[],
  limit = 40
): VendorPriceAlert[] {
  const grouped = new Map<string, VendorPricePoint[]>()

  for (const point of points) {
    const key = groupKey(point)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(point)
  }

  const alerts: VendorPriceAlert[] = []

  for (const [key, group] of grouped) {
    const sorted = [...group].sort((a, b) =>
      toIso(b.recorded_at).localeCompare(toIso(a.recorded_at))
    )
    if (sorted.length < 2) continue

    const latest = sorted[0]
    const previous = sorted[1]
    if (latest.price_cents === previous.price_cents) continue

    const delta = latest.price_cents - previous.price_cents
    const base = previous.price_cents === 0 ? 1 : previous.price_cents
    const deltaPercent = (delta / base) * 100

    alerts.push({
      key,
      vendor_id: latest.vendor_id,
      vendor_name: latest.vendor_name,
      item_name: latest.item_name,
      unit: latest.unit,
      current_price_cents: latest.price_cents,
      previous_price_cents: previous.price_cents,
      delta_cents: delta,
      delta_percent: deltaPercent,
      direction: delta > 0 ? 'up' : 'down',
      changed_at: latest.recorded_at,
    })
  }

  return alerts
    .sort((a, b) => {
      const byMagnitude = Math.abs(b.delta_percent) - Math.abs(a.delta_percent)
      if (byMagnitude !== 0) return byMagnitude
      return toIso(b.changed_at).localeCompare(toIso(a.changed_at))
    })
    .slice(0, Math.max(1, limit))
}

export function computeVendorPriceTrends(
  points: VendorPricePoint[],
  options?: { maxItems?: number; pointsPerItem?: number }
): VendorPriceTrend[] {
  const maxItems = Math.max(1, options?.maxItems ?? 20)
  const pointsPerItem = Math.max(2, options?.pointsPerItem ?? 8)

  const grouped = new Map<string, VendorPricePoint[]>()
  for (const point of points) {
    const key = groupKey(point)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(point)
  }

  const trends: VendorPriceTrend[] = []
  for (const [key, group] of grouped) {
    const sortedAsc = [...group]
      .sort((a, b) => toIso(a.recorded_at).localeCompare(toIso(b.recorded_at)))
      .slice(-pointsPerItem)

    if (sortedAsc.length === 0) continue

    const latest = sortedAsc[sortedAsc.length - 1]
    const previous = sortedAsc.length > 1 ? sortedAsc[sortedAsc.length - 2] : null
    const first = sortedAsc[0]
    const base = first.price_cents === 0 ? 1 : first.price_cents
    const changePercent = ((latest.price_cents - first.price_cents) / base) * 100

    let direction: 'up' | 'down' | 'flat' = 'flat'
    if (latest.price_cents > first.price_cents) direction = 'up'
    else if (latest.price_cents < first.price_cents) direction = 'down'

    trends.push({
      key,
      vendor_id: latest.vendor_id,
      vendor_name: latest.vendor_name,
      item_name: latest.item_name,
      unit: latest.unit,
      points: sortedAsc.map((row) => ({
        recorded_at: row.recorded_at,
        price_cents: row.price_cents,
      })),
      latest_price_cents: latest.price_cents,
      previous_price_cents: previous?.price_cents ?? null,
      direction,
      change_percent: sortedAsc.length > 1 ? changePercent : null,
    })
  }

  return trends
    .sort((a, b) => {
      const byChangedAt = toIso(b.points[b.points.length - 1].recorded_at).localeCompare(
        toIso(a.points[a.points.length - 1].recorded_at)
      )
      if (byChangedAt !== 0) return byChangedAt
      return Math.abs(b.change_percent ?? 0) - Math.abs(a.change_percent ?? 0)
    })
    .slice(0, maxItems)
}
