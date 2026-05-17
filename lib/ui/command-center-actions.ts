'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  CommandWidget,
  DashboardLayout,
  DashboardMetric,
  CommandCenterSummary,
} from './command-center-types'

// ── Helpers ──────────────────────────────────────────────

function mapLayout(row: any): DashboardLayout {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    chefId: row.chef_id,
    name: row.name,
    widgets: (row.widgets ?? []) as CommandWidget[],
    isDefault: row.is_default ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapMetric(row: any): DashboardMetric {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    key: row.key,
    label: row.label,
    value: row.value,
    previousValue: row.previous_value ?? undefined,
    trend: row.trend as DashboardMetric['trend'] ?? undefined,
    unit: row.unit ?? undefined,
    updatedAt: row.updated_at,
  }
}

// ── Actions ──────────────────────────────────────────────

/**
 * Get a dashboard layout by ID, or the default layout if no ID given.
 */
export async function getDashboardLayout(layoutId?: string): Promise<DashboardLayout | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (layoutId) {
    const { data, error } = await db
      .from('dashboard_layouts')
      .select('*')
      .eq('id', layoutId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (error || !data) return null
    return mapLayout(data)
  }

  // No ID: return default layout
  const { data, error } = await db
    .from('dashboard_layouts')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('chef_id', user.entityId!)
    .eq('is_default', true)
    .single()

  if (error || !data) return null
  return mapLayout(data)
}

/**
 * Save a dashboard layout. Creates new or updates existing by name.
 */
export async function saveDashboardLayout(
  name: string,
  widgets: CommandWidget[],
  isDefault?: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!name || !Array.isArray(widgets)) {
    return { success: false, error: 'Name and widgets are required' }
  }

  // If marking as default, unset other defaults first
  if (isDefault) {
    await db
      .from('dashboard_layouts')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('tenant_id', user.tenantId!)
      .eq('chef_id', user.entityId!)
      .eq('is_default', true)
  }

  // Check if layout with this name exists
  const { data: existing } = await db
    .from('dashboard_layouts')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('chef_id', user.entityId!)
    .eq('name', name)
    .single()

  if (existing) {
    const { error } = await db
      .from('dashboard_layouts')
      .update({
        widgets,
        is_default: isDefault ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db
      .from('dashboard_layouts')
      .insert({
        tenant_id: user.tenantId!,
        chef_id: user.entityId!,
        name,
        widgets,
        is_default: isDefault ?? false,
      })

    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get all dashboard metrics for the current tenant.
 */
export async function getDashboardMetrics(): Promise<DashboardMetric[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('dashboard_metrics')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('key', { ascending: true })

  if (error || !data) return []
  return data.map(mapMetric)
}

/**
 * Upsert a dashboard metric by key.
 */
export async function updateDashboardMetric(
  key: string,
  label: string,
  value: string,
  previousValue?: string,
  trend?: 'up' | 'down' | 'flat',
  unit?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!key || !label || value === undefined) {
    return { success: false, error: 'Key, label, and value are required' }
  }

  const { data: existing } = await db
    .from('dashboard_metrics')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('key', key)
    .single()

  const payload = {
    key,
    label,
    value,
    previous_value: previousValue ?? null,
    trend: trend ?? null,
    unit: unit ?? null,
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    const { error } = await db
      .from('dashboard_metrics')
      .update(payload)
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db
      .from('dashboard_metrics')
      .insert({ tenant_id: user.tenantId!, ...payload })

    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * List available widget types with descriptions.
 */
export async function getAvailableWidgets(): Promise<
  { type: string; label: string; description: string }[]
> {
  await requireChef()

  return [
    { type: 'metric', label: 'Metric Card', description: 'Single KPI with trend indicator' },
    { type: 'chart', label: 'Chart', description: 'Visual data chart (bar, line, pie)' },
    { type: 'list', label: 'List', description: 'Scrollable list of items or tasks' },
    { type: 'calendar', label: 'Calendar', description: 'Upcoming events and bookings' },
    { type: 'action', label: 'Quick Action', description: 'One-click shortcut to common tasks' },
    { type: 'feed', label: 'Activity Feed', description: 'Recent activity and notifications' },
  ]
}

/**
 * List all saved layouts for the current chef.
 */
export async function getDashboardLayouts(): Promise<DashboardLayout[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('dashboard_layouts')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('chef_id', user.entityId!)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data.map(mapLayout)
}

/**
 * Get aggregate command center summary.
 */
export async function getCommandCenterSummary(): Promise<CommandCenterSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [layoutRes, metricRes] = await Promise.all([
    db
      .from('dashboard_layouts')
      .select('id, widgets, updated_at')
      .eq('tenant_id', user.tenantId!)
      .eq('chef_id', user.entityId!),
    db
      .from('dashboard_metrics')
      .select('id, updated_at')
      .eq('tenant_id', user.tenantId!),
  ])

  const layouts = layoutRes.data ?? []
  const metrics = metricRes.data ?? []

  const activeWidgets = layouts.reduce(
    (sum: number, l: any) => sum + (Array.isArray(l.widgets) ? l.widgets.length : 0),
    0
  )

  const allDates = [
    ...layouts.map((l: any) => l.updated_at),
    ...metrics.map((m: any) => m.updated_at),
  ].filter(Boolean)

  const lastUpdated = allDates.length
    ? allDates.sort().reverse()[0]
    : null

  return {
    totalLayouts: layouts.length,
    totalMetrics: metrics.length,
    activeWidgets,
    lastUpdated,
  }
}
