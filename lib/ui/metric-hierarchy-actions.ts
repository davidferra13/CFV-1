'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { MetricTier, MetricFormat, MetricConfig, MetricGroup, MetricHierarchySummary } from './metric-hierarchy-types'

export async function getMetricConfigs(tier?: MetricTier, groupName?: string): Promise<MetricConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM metric_configs WHERE tenant_id = $1'
  if (tier) {
    params.push(tier)
    query += ` AND tier = $${params.length}`
  }
  if (groupName) {
    params.push(groupName)
    query += ` AND group_name = $${params.length}`
  }
  query += ' ORDER BY "order", created_at'
  const rows = await db.query(query, params)
  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    key: r.key,
    label: r.label,
    tier: r.tier as MetricTier,
    format: r.format as MetricFormat,
    icon: r.icon ?? null,
    route: r.route ?? null,
    order: r.order ?? 0,
    groupName: r.group_name ?? null,
    createdAt: new Date(r.created_at),
  }))
}

export async function upsertMetricConfig(
  key: string,
  label: string,
  tier: MetricTier,
  format: MetricFormat,
  icon?: string,
  route?: string,
  order?: number,
  groupName?: string,
): Promise<MetricConfig> {
  const user = await requireChef()
  const db: any = createServerClient()
  const query = `
    INSERT INTO metric_configs (tenant_id, key, label, tier, format, icon, route, "order", group_name)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (tenant_id, key)
    DO UPDATE SET label = $3, tier = $4, format = $5, icon = $6, route = $7, "order" = $8, group_name = $9
    RETURNING *
  `
  const rows = await db.query(query, [
    user.tenantId,
    key,
    label,
    tier,
    format,
    icon ?? null,
    route ?? null,
    order ?? 0,
    groupName ?? null,
  ])
  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    key: r.key,
    label: r.label,
    tier: r.tier as MetricTier,
    format: r.format as MetricFormat,
    icon: r.icon ?? null,
    route: r.route ?? null,
    order: r.order ?? 0,
    groupName: r.group_name ?? null,
    createdAt: new Date(r.created_at),
  }
}

export async function getMetricGroups(): Promise<MetricGroup[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'SELECT * FROM metric_configs WHERE tenant_id = $1 ORDER BY group_name, "order", created_at',
    [user.tenantId],
  )
  const groups = new Map<string, MetricConfig[]>()
  for (const r of rows) {
    const name = r.group_name ?? 'Ungrouped'
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name)!.push({
      id: r.id,
      tenantId: r.tenant_id,
      key: r.key,
      label: r.label,
      tier: r.tier as MetricTier,
      format: r.format as MetricFormat,
      icon: r.icon ?? null,
      route: r.route ?? null,
      order: r.order ?? 0,
      groupName: r.group_name ?? null,
      createdAt: new Date(r.created_at),
    })
  }
  return Array.from(groups.entries()).map(([name, metrics]) => ({
    name,
    metrics,
  }))
}

export async function reorderMetrics(metricIds: string[]): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  for (let i = 0; i < metricIds.length; i++) {
    await db.query(
      'UPDATE metric_configs SET "order" = $1 WHERE id = $2 AND tenant_id = $3',
      [i, metricIds[i], user.tenantId],
    )
  }
}

export async function deleteMetricConfig(metricId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  await db.query(
    'DELETE FROM metric_configs WHERE id = $1 AND tenant_id = $2',
    [metricId, user.tenantId],
  )
}

export async function getMetricHierarchySummary(): Promise<MetricHierarchySummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'SELECT tier, format, group_name FROM metric_configs WHERE tenant_id = $1',
    [user.tenantId],
  )
  const byTier: Record<MetricTier, number> = { hero: 0, primary: 0, secondary: 0, detail: 0 }
  const byFormat: Record<MetricFormat, number> = { number: 0, currency: 0, percentage: 0, duration: 0, count: 0 }
  const groupNames = new Set<string>()
  for (const r of rows) {
    if (r.tier in byTier) byTier[r.tier as MetricTier]++
    if (r.format in byFormat) byFormat[r.format as MetricFormat]++
    groupNames.add(r.group_name ?? 'Ungrouped')
  }
  return {
    totalMetrics: rows.length,
    byTier,
    byFormat,
    totalGroups: groupNames.size,
  }
}
