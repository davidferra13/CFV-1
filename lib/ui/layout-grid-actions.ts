'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  Breakpoint,
  GridConfig,
  ContainerConfig,
  LayoutAudit,
  LayoutGridSummary,
} from './layout-grid-types'

/**
 * List all grid configs for the current tenant.
 */
export async function getGridConfigs(): Promise<GridConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('grid_configs')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as any[]).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    columns: row.columns,
    gutter: row.gutter,
    margin: row.margin,
    maxWidth: row.max_width,
    breakpoints: row.breakpoints ?? {},
    createdAt: row.created_at,
  }))
}

/**
 * Upsert a grid configuration by name within the tenant.
 * Creates if no matching name exists, updates if it does.
 */
export async function upsertGridConfig(
  name: string,
  columns: number,
  gutter: string,
  margin: string,
  maxWidth: string,
  breakpoints: Record<Breakpoint, number>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (columns < 1 || columns > 24) {
    return { success: false, error: 'Columns must be between 1 and 24' }
  }

  const { data: existing } = await db
    .from('grid_configs')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('name', name)
    .single()

  if (existing) {
    const { error } = await db
      .from('grid_configs')
      .update({
        columns,
        gutter,
        margin,
        max_width: maxWidth,
        breakpoints,
      })
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db.from('grid_configs').insert({
      tenant_id: user.tenantId!,
      name,
      columns,
      gutter,
      margin,
      max_width: maxWidth,
      breakpoints,
    })

    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * List all container configs for the current tenant.
 */
export async function getContainerConfigs(): Promise<ContainerConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('container_configs')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as any[]).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    maxWidth: row.max_width,
    padding: row.padding,
    responsive: row.responsive ?? true,
    breakpointOverrides: row.breakpoint_overrides ?? null,
    createdAt: row.created_at,
  }))
}

/**
 * Upsert a container configuration by name within the tenant.
 * Creates if no matching name exists, updates if it does.
 */
export async function upsertContainerConfig(
  name: string,
  maxWidth: string,
  padding: string,
  responsive: boolean,
  breakpointOverrides?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('container_configs')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('name', name)
    .single()

  if (existing) {
    const { error } = await db
      .from('container_configs')
      .update({
        max_width: maxWidth,
        padding,
        responsive,
        breakpoint_overrides: breakpointOverrides ?? null,
      })
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db.from('container_configs').insert({
      tenant_id: user.tenantId!,
      name,
      max_width: maxWidth,
      padding,
      responsive,
      breakpoint_overrides: breakpointOverrides ?? null,
    })

    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Record a layout compliance audit for a route.
 */
export async function auditLayout(
  route: string,
  gridCompliant: boolean,
  containerCompliant: boolean,
  issues: Array<{ rule: string; element: string; detail: string }>,
  score: number
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (score < 0 || score > 100) {
    return { success: false, error: 'Score must be between 0 and 100' }
  }

  const { error } = await db.from('layout_audits').insert({
    tenant_id: user.tenantId!,
    route,
    grid_compliant: gridCompliant,
    container_compliant: containerCompliant,
    issues,
    score,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Aggregate layout grid system stats for the current tenant.
 */
export async function getLayoutGridSummary(): Promise<LayoutGridSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: grids } = await db.from('grid_configs').select('id').eq('tenant_id', user.tenantId!)

  const { data: containers } = await db
    .from('container_configs')
    .select('id')
    .eq('tenant_id', user.tenantId!)

  const { data: audits } = await db
    .from('layout_audits')
    .select('score, grid_compliant, container_compliant, route')
    .eq('tenant_id', user.tenantId!)

  const totalGrids = grids?.length ?? 0
  const totalContainers = containers?.length ?? 0
  const totalAudits = audits?.length ?? 0

  const avgScore =
    totalAudits > 0
      ? Math.round(
          (audits as any[]).reduce((sum: number, a: any) => sum + (a.score ?? 0), 0) / totalAudits
        )
      : 0

  const nonCompliantRoutes: string[] = []
  if (audits) {
    for (const a of audits as any[]) {
      if (!a.grid_compliant || !a.container_compliant) {
        if (!nonCompliantRoutes.includes(a.route)) {
          nonCompliantRoutes.push(a.route)
        }
      }
    }
  }

  return { totalGrids, totalContainers, totalAudits, avgScore, nonCompliantRoutes }
}
