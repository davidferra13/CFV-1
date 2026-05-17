'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  StatusBadgeConfig,
  EntityStatusMapping,
  ProgressLanguageEntry,
  ProgressStage,
  StatusBadgeSummary,
} from './status-badge-types'

/**
 * Get badge config for a specific entity type + status value.
 */
export async function getStatusBadgeConfig(
  entityType: string,
  statusValue: string
): Promise<StatusBadgeConfig | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('entity_status_mappings')
    .select('badge_config')
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', entityType)
    .eq('status_value', statusValue)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.badge_config as StatusBadgeConfig | null
}

/**
 * List all status-to-badge mappings, optionally filtered by entity type.
 */
export async function getEntityStatusMappings(entityType?: string): Promise<EntityStatusMapping[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('entity_status_mappings')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('entity_type')
    .order('status_value')

  if (entityType) {
    query = query.eq('entity_type', entityType)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []).map(mapRowToEntityStatusMapping)
}

/**
 * Create or update a status-to-badge mapping.
 */
export async function upsertStatusMapping(
  entityType: string,
  statusField: string,
  statusValue: string,
  badgeConfig: StatusBadgeConfig
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('entity_status_mappings').upsert(
    {
      tenant_id: user.tenantId!,
      entity_type: entityType,
      status_field: statusField,
      status_value: statusValue,
      badge_config: badgeConfig,
    },
    { onConflict: 'tenant_id,entity_type,status_field,status_value' }
  )

  if (error) throw error
}

/**
 * Get progress stage labels for an entity type.
 */
export async function getProgressLanguage(entityType: string): Promise<ProgressLanguageEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('progress_language_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', entityType)
    .order('percent_complete')

  if (error) throw error
  return (data ?? []).map(mapRowToProgressEntry)
}

/**
 * Set progress language for an entity type + stage.
 */
export async function upsertProgressLanguage(
  entityType: string,
  stage: ProgressStage,
  label: string,
  description: string | null,
  percentComplete: number
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('progress_language_entries').upsert(
    {
      tenant_id: user.tenantId!,
      entity_type: entityType,
      stage,
      label,
      description,
      percent_complete: percentComplete,
    },
    { onConflict: 'tenant_id,entity_type,stage' }
  )

  if (error) throw error
}

/**
 * Aggregate stats on badge usage across all entity types.
 */
export async function getStatusBadgeSummary(): Promise<StatusBadgeSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('entity_status_mappings')
    .select('entity_type, badge_config')
    .eq('tenant_id', user.tenantId!)

  if (error) throw error

  const rows = (data ?? []) as Array<{
    entity_type: string
    badge_config: StatusBadgeConfig
  }>

  const byEntityType: Record<string, number> = {}
  const byVariant: Record<string, number> = {}

  for (const row of rows) {
    byEntityType[row.entity_type] = (byEntityType[row.entity_type] ?? 0) + 1
    const variant = row.badge_config?.variant ?? 'neutral'
    byVariant[variant] = (byVariant[variant] ?? 0) + 1
  }

  return {
    totalMappings: rows.length,
    byEntityType,
    byVariant,
    unmappedStatuses: [],
  }
}

// ---- Internal mappers ----

function mapRowToEntityStatusMapping(row: any): EntityStatusMapping {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    entityType: row.entity_type,
    statusField: row.status_field,
    statusValue: row.status_value,
    badgeConfig: row.badge_config as StatusBadgeConfig,
    createdAt: row.created_at,
  }
}

function mapRowToProgressEntry(row: any): ProgressLanguageEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    entityType: row.entity_type,
    stage: row.stage as ProgressStage,
    label: row.label,
    description: row.description,
    percentComplete: row.percent_complete ?? 0,
    createdAt: row.created_at,
  }
}
