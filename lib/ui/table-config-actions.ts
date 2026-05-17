'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  TablePreference,
  FilterPreset,
  TableDensity,
  SortDirection,
  ColumnConfig,
  TableConfigSummary,
} from './table-config-types'

/**
 * Get current chef's table preference for a specific table.
 */
export async function getTablePreference(tableId: string): Promise<TablePreference | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('table_preferences')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('chef_id', user.entityId!)
    .eq('table_id', tableId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    tenantId: data.tenant_id,
    chefId: data.chef_id,
    tableId: data.table_id,
    columns: (data.columns ?? []) as ColumnConfig[],
    pageSize: data.page_size ?? 25,
    density: (data.density ?? 'normal') as TableDensity,
    sortColumn: data.sort_column ?? null,
    sortDirection: data.sort_direction as SortDirection | null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/**
 * Save or update table preference for the current chef.
 */
export async function updateTablePreference(
  tableId: string,
  opts: {
    columns?: ColumnConfig[]
    pageSize?: number
    density?: TableDensity
    sortColumn?: string | null
    sortDirection?: SortDirection | null
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (opts.density && !['compact', 'normal', 'spacious'].includes(opts.density)) {
    return { success: false, error: 'Invalid density mode' }
  }

  if (opts.sortDirection && !['asc', 'desc'].includes(opts.sortDirection)) {
    return { success: false, error: 'Invalid sort direction' }
  }

  const { data: existing } = await db
    .from('table_preferences')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('chef_id', user.entityId!)
    .eq('table_id', tableId)
    .single()

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (opts.columns !== undefined) payload.columns = opts.columns
  if (opts.pageSize !== undefined) payload.page_size = opts.pageSize
  if (opts.density !== undefined) payload.density = opts.density
  if (opts.sortColumn !== undefined) payload.sort_column = opts.sortColumn
  if (opts.sortDirection !== undefined) payload.sort_direction = opts.sortDirection

  if (existing) {
    const { error } = await db
      .from('table_preferences')
      .update(payload)
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db.from('table_preferences').insert({
      tenant_id: user.tenantId!,
      chef_id: user.entityId!,
      table_id: tableId,
      ...payload,
    })

    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get saved filter presets for a table.
 */
export async function getFilterPresets(tableId: string): Promise<FilterPreset[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('filter_presets')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('chef_id', user.entityId!)
    .eq('table_id', tableId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    chefId: row.chef_id,
    tableId: row.table_id,
    name: row.name,
    filters: row.filters as Record<string, unknown>,
    isDefault: row.is_default ?? false,
    createdAt: row.created_at,
  }))
}

/**
 * Save a filter preset for a table.
 * If isDefault is true, clears default on other presets for this table.
 */
export async function saveFilterPreset(
  tableId: string,
  name: string,
  filters: Record<string, unknown>,
  isDefault?: boolean
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!name.trim()) {
    return { success: false, error: 'Preset name is required' }
  }

  // Clear existing default if setting new one
  if (isDefault) {
    await db
      .from('filter_presets')
      .update({ is_default: false })
      .eq('tenant_id', user.tenantId!)
      .eq('chef_id', user.entityId!)
      .eq('table_id', tableId)
      .eq('is_default', true)
  }

  const { data, error } = await db
    .from('filter_presets')
    .insert({
      tenant_id: user.tenantId!,
      chef_id: user.entityId!,
      table_id: tableId,
      name: name.trim(),
      filters,
      is_default: isDefault ?? false,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  return { success: true, id: data?.id }
}

/**
 * Delete a filter preset. Only deletes presets owned by the current chef.
 */
export async function deleteFilterPreset(
  presetId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('filter_presets')
    .delete()
    .eq('id', presetId)
    .eq('tenant_id', user.tenantId!)
    .eq('chef_id', user.entityId!)

  if (error) return { success: false, error: error.message }

  return { success: true }
}

/**
 * Log a bulk action performed on a table.
 */
export async function logBulkAction(
  tableId: string,
  action: string,
  entityIds: string[],
  result: Record<string, unknown> | null
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!action.trim()) {
    return { success: false, error: 'Action name is required' }
  }

  if (!entityIds.length) {
    return { success: false, error: 'At least one entity ID is required' }
  }

  const { error } = await db.from('bulk_action_logs').insert({
    tenant_id: user.tenantId!,
    table_id: tableId,
    action: action.trim(),
    entity_ids: entityIds,
    result,
    performed_by: user.entityId!,
  })

  if (error) return { success: false, error: error.message }

  return { success: true }
}

/**
 * Get aggregate stats for table configuration usage across the chef's tenant.
 */
export async function getTableConfigSummary(): Promise<TableConfigSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [prefsResult, filtersResult, bulkResult] = await Promise.all([
    db
      .from('table_preferences')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!),
    db
      .from('filter_presets')
      .select('table_id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!),
    db
      .from('bulk_action_logs')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId!),
  ])

  return {
    totalTables: prefsResult.count ?? 0,
    customized: prefsResult.count ?? 0,
    withFilters: filtersResult.count ?? 0,
    bulkActionsUsed: bulkResult.count ?? 0,
  }
}
