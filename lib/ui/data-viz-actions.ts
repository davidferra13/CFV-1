'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ChartConfig,
  ChartType,
  DataSeries,
  DataVizSummary,
  VisualizationPreset,
} from './data-viz-types'

// ---------------------------------------------------------------------------
// getChartConfig
// ---------------------------------------------------------------------------
export async function getChartConfig(chartId: string): Promise<ChartConfig | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = await db
    .from('chart_configs')
    .select('*')
    .where({ tenant_id: user.id, chart_id: chartId })
    .limit(1)

  if (!rows.length) return null

  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    chartId: r.chart_id,
    type: r.type as ChartType,
    title: r.title,
    series: (r.series ?? []) as DataSeries[],
    xAxis: r.x_axis ?? undefined,
    yAxis: r.y_axis ?? undefined,
    legend: r.legend ?? true,
    responsive: r.responsive ?? true,
    createdAt: new Date(r.created_at),
  }
}

// ---------------------------------------------------------------------------
// upsertChartConfig
// ---------------------------------------------------------------------------
export async function upsertChartConfig(
  chartId: string,
  type: ChartType,
  title: string,
  series: DataSeries[],
  xAxis?: Record<string, unknown>,
  yAxis?: Record<string, unknown>
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db.from('chart_configs').upsert(
    {
      tenant_id: user.id,
      chart_id: chartId,
      type,
      title,
      series: JSON.stringify(series),
      x_axis: xAxis ? JSON.stringify(xAxis) : null,
      y_axis: yAxis ? JSON.stringify(yAxis) : null,
    },
    { onConflict: ['tenant_id', 'chart_id'] }
  )

  return { success: true }
}

// ---------------------------------------------------------------------------
// getRevenueChartData
// ---------------------------------------------------------------------------
export async function getRevenueChartData(
  period: 'week' | 'month' | 'quarter' | 'year'
): Promise<{ labels: string[]; values: number[] }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const intervalMap: Record<string, string> = {
    week: '7 days',
    month: '30 days',
    quarter: '90 days',
    year: '365 days',
  }

  const rows = await db.query(
    `SELECT date_trunc('day', created_at)::date AS day, COALESCE(SUM(amount_cents), 0) AS total
     FROM ledger_entries
     WHERE tenant_id = $1
       AND created_at >= NOW() - INTERVAL '${intervalMap[period]}'
     GROUP BY day ORDER BY day`,
    [user.id]
  )

  return {
    labels: rows.map((r: any) => String(r.day)),
    values: rows.map((r: any) => Number(r.total) / 100),
  }
}

// ---------------------------------------------------------------------------
// getEventVolumeData
// ---------------------------------------------------------------------------
export async function getEventVolumeData(
  period: 'week' | 'month' | 'quarter' | 'year'
): Promise<{ labels: string[]; values: number[] }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const intervalMap: Record<string, string> = {
    week: '7 days',
    month: '30 days',
    quarter: '90 days',
    year: '365 days',
  }

  const rows = await db.query(
    `SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS cnt
     FROM events
     WHERE tenant_id = $1
       AND created_at >= NOW() - INTERVAL '${intervalMap[period]}'
     GROUP BY day ORDER BY day`,
    [user.id]
  )

  return {
    labels: rows.map((r: any) => String(r.day)),
    values: rows.map((r: any) => Number(r.cnt)),
  }
}

// ---------------------------------------------------------------------------
// getClientDistributionData
// ---------------------------------------------------------------------------
export async function getClientDistributionData(): Promise<{
  labels: string[]
  values: number[]
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = await db.query(
    `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS cnt
     FROM clients
     WHERE tenant_id = $1
     GROUP BY status ORDER BY cnt DESC`,
    [user.id]
  )

  return {
    labels: rows.map((r: any) => String(r.status)),
    values: rows.map((r: any) => Number(r.cnt)),
  }
}

// ---------------------------------------------------------------------------
// saveVisualizationPreset
// ---------------------------------------------------------------------------
export async function saveVisualizationPreset(
  name: string,
  chartId: string,
  dateRange: Record<string, unknown> | null,
  filters: Record<string, unknown>
): Promise<{ success: boolean; id: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = await db
    .from('visualization_presets')
    .insert({
      tenant_id: user.id,
      name,
      chart_id: chartId,
      date_range: dateRange ? JSON.stringify(dateRange) : null,
      filters: JSON.stringify(filters),
    })
    .returning('id')

  return { success: true, id: rows[0].id }
}

// ---------------------------------------------------------------------------
// getDataVizSummary
// ---------------------------------------------------------------------------
export async function getDataVizSummary(): Promise<DataVizSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [chartRows, presetRows] = await Promise.all([
    db.query(
      `SELECT type, COUNT(*)::int AS cnt FROM chart_configs WHERE tenant_id = $1 GROUP BY type`,
      [user.id]
    ),
    db.query(`SELECT COUNT(*)::int AS cnt FROM visualization_presets WHERE tenant_id = $1`, [
      user.id,
    ]),
  ])

  const byType: Record<string, number> = {}
  let totalCharts = 0
  for (const r of chartRows) {
    byType[r.type] = Number(r.cnt)
    totalCharts += Number(r.cnt)
  }

  // Most viewed: pick chart with most presets referencing it
  const mostViewedRows = await db.query(
    `SELECT chart_id, COUNT(*)::int AS cnt
     FROM visualization_presets
     WHERE tenant_id = $1
     GROUP BY chart_id ORDER BY cnt DESC LIMIT 1`,
    [user.id]
  )

  return {
    totalCharts,
    byType: byType as Record<ChartType, number>,
    totalPresets: Number(presetRows[0]?.cnt ?? 0),
    mostViewed: mostViewedRows[0]?.chart_id ?? null,
  }
}
