'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { DensityMode, WorkspaceMode, WorkspacePreferences } from './density-types'

// ---------------------------------------------------------------------------
// 1. Get workspace preferences (upsert default if missing)
// ---------------------------------------------------------------------------

export async function getWorkspacePreferences(): Promise<WorkspacePreferences> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('workspace_preferences')
    .select('*')
    .eq('tenant_id', user.id)
    .maybeSingle()

  if (error) throw new Error(`Failed to load workspace preferences: ${error.message}`)

  if (data) {
    return mapRow(data)
  }

  // Upsert default row
  const { data: inserted, error: insertErr } = await db
    .from('workspace_preferences')
    .insert({
      tenant_id: user.id,
      density_mode: 'comfortable',
      workspace_mode: 'overview',
      sidebar_collapsed: false,
      compact_tables: false,
      show_quick_actions: true,
    })
    .select('*')
    .single()

  if (insertErr) throw new Error(`Failed to create workspace preferences: ${insertErr.message}`)

  return mapRow(inserted)
}

// ---------------------------------------------------------------------------
// 2. Update density mode
// ---------------------------------------------------------------------------

export async function updateDensityMode(mode: DensityMode): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const valid: DensityMode[] = ['compact', 'comfortable', 'spacious']
  if (!valid.includes(mode)) throw new Error(`Invalid density mode: ${mode}`)

  // Ensure row exists
  await getWorkspacePreferences()

  const { error } = await db
    .from('workspace_preferences')
    .update({ density_mode: mode, updated_at: new Date().toISOString() })
    .eq('tenant_id', user.id)

  if (error) throw new Error(`Failed to update density mode: ${error.message}`)
}

// ---------------------------------------------------------------------------
// 3. Update workspace mode
// ---------------------------------------------------------------------------

export async function updateWorkspaceMode(mode: WorkspaceMode): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const valid: WorkspaceMode[] = ['focus', 'overview', 'planning']
  if (!valid.includes(mode)) throw new Error(`Invalid workspace mode: ${mode}`)

  // Ensure row exists
  await getWorkspacePreferences()

  const { error } = await db
    .from('workspace_preferences')
    .update({ workspace_mode: mode, updated_at: new Date().toISOString() })
    .eq('tenant_id', user.id)

  if (error) throw new Error(`Failed to update workspace mode: ${error.message}`)
}

// ---------------------------------------------------------------------------
// 4. Update a boolean preference field
// ---------------------------------------------------------------------------

const BOOLEAN_FIELDS = ['sidebar_collapsed', 'compact_tables', 'show_quick_actions'] as const
type BooleanField = typeof BOOLEAN_FIELDS[number]

const FIELD_MAP: Record<string, BooleanField> = {
  sidebarCollapsed: 'sidebar_collapsed',
  compactTables: 'compact_tables',
  showQuickActions: 'show_quick_actions',
  sidebar_collapsed: 'sidebar_collapsed',
  compact_tables: 'compact_tables',
  show_quick_actions: 'show_quick_actions',
}

export async function updatePreferenceField(field: string, value: boolean): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const dbField = FIELD_MAP[field]
  if (!dbField) throw new Error(`Invalid preference field: ${field}`)
  if (typeof value !== 'boolean') throw new Error('Value must be a boolean')

  // Ensure row exists
  await getWorkspacePreferences()

  const { error } = await db
    .from('workspace_preferences')
    .update({ [dbField]: value, updated_at: new Date().toISOString() })
    .eq('tenant_id', user.id)

  if (error) throw new Error(`Failed to update ${field}: ${error.message}`)
}

// ---------------------------------------------------------------------------
// 5. Get available layouts (pure function, no DB)
// ---------------------------------------------------------------------------

export async function getAvailableLayouts() {
  await requireChef()

  return {
    densityModes: [
      { value: 'compact' as const, label: 'Compact', description: 'Maximum information density, minimal spacing' },
      { value: 'comfortable' as const, label: 'Comfortable', description: 'Balanced spacing for everyday use' },
      { value: 'spacious' as const, label: 'Spacious', description: 'Generous whitespace, relaxed layout' },
    ],
    workspaceModes: [
      { value: 'focus' as const, label: 'Focus', description: 'Single-task view, minimal distractions' },
      { value: 'overview' as const, label: 'Overview', description: 'Dashboard view with key metrics visible' },
      { value: 'planning' as const, label: 'Planning', description: 'Expanded view for scheduling and prep work' },
    ],
    toggles: [
      { field: 'sidebarCollapsed', label: 'Collapse Sidebar', description: 'Hide sidebar navigation' },
      { field: 'compactTables', label: 'Compact Tables', description: 'Reduce table row height' },
      { field: 'showQuickActions', label: 'Show Quick Actions', description: 'Display quick action buttons' },
    ],
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRow(row: any): WorkspacePreferences {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    densityMode: row.density_mode,
    workspaceMode: row.workspace_mode,
    sidebarCollapsed: row.sidebar_collapsed,
    compactTables: row.compact_tables,
    showQuickActions: row.show_quick_actions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
