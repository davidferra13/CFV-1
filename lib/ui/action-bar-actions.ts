'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ActionBarContext,
  ActionBarConfig,
  ActionBarItem,
  ActionBarSummary,
} from './action-bar-types'

const CONFIGS_TABLE = 'action_bar_configs'
const USAGE_TABLE = 'action_bar_usage_logs'

const VALID_CONTEXTS: ActionBarContext[] = [
  'event_detail', 'client_detail', 'menu_editor',
  'dashboard', 'calendar', 'finance', 'settings',
]

const VALID_VARIANTS = ['primary', 'secondary', 'danger', 'ghost']

function mapConfigRow(row: any): ActionBarConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    context: row.context as ActionBarContext,
    items: (row.items ?? []) as ActionBarItem[],
    lifecycleStage: row.lifecycle_stage ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Get action bar configuration for a context (optionally scoped to lifecycle stage).
 * Falls back to default if no saved config.
 */
export async function getActionBarConfig(
  context: ActionBarContext,
  lifecycleStage?: string
): Promise<ActionBarConfig> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!VALID_CONTEXTS.includes(context)) {
    return buildDefaultConfig(user.tenantId!, context)
  }

  let query = db
    .from(CONFIGS_TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('context', context)

  if (lifecycleStage) {
    query = query.eq('lifecycle_stage', lifecycleStage)
  } else {
    query = query.is('lifecycle_stage', null)
  }

  const { data, error } = await query.limit(1).single()

  if (error || !data) {
    return buildDefaultConfig(user.tenantId!, context, lifecycleStage)
  }

  return mapConfigRow(data)
}

/**
 * Create or update an action bar configuration.
 */
export async function upsertActionBarConfig(
  context: ActionBarContext,
  items: ActionBarItem[],
  lifecycleStage?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!VALID_CONTEXTS.includes(context)) {
    return { success: false, error: 'Invalid context' }
  }

  // Validate items
  for (const item of items) {
    if (!item.id || !item.label) {
      return { success: false, error: 'Each item requires an id and label' }
    }
    if (!VALID_VARIANTS.includes(item.variant)) {
      return { success: false, error: `Invalid variant: ${item.variant}` }
    }
  }

  // Sort items by order
  const sortedItems = [...items].sort((a, b) => a.order - b.order)

  // Check if config exists
  let existsQuery = db
    .from(CONFIGS_TABLE)
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('context', context)

  if (lifecycleStage) {
    existsQuery = existsQuery.eq('lifecycle_stage', lifecycleStage)
  } else {
    existsQuery = existsQuery.is('lifecycle_stage', null)
  }

  const { data: existing } = await existsQuery.limit(1).single()

  if (existing) {
    // Update
    const { error } = await db
      .from(CONFIGS_TABLE)
      .update({
        items: sortedItems,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    if (error) return { success: false, error: error.message }
    return { success: true, id: existing.id }
  }

  // Insert
  const { data, error } = await db
    .from(CONFIGS_TABLE)
    .insert({
      tenant_id: user.tenantId!,
      context,
      items: sortedItems,
      lifecycle_stage: lifecycleStage ?? null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, id: data?.id }
}

/**
 * Log an action bar usage event.
 */
export async function logActionBarUsage(
  context: ActionBarContext,
  actionId: string,
  lifecycleStage?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!actionId) {
    return { success: false, error: 'actionId is required' }
  }

  const { error } = await db
    .from(USAGE_TABLE)
    .insert({
      tenant_id: user.tenantId!,
      context,
      action_id: actionId,
      lifecycle_stage: lifecycleStage ?? null,
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Get action bar usage statistics.
 */
export async function getActionBarUsageStats(
  context?: ActionBarContext,
  limit: number = 20
): Promise<Array<{ actionId: string; context: string; count: number }>> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from(USAGE_TABLE)
    .select('action_id, context')
    .eq('tenant_id', user.tenantId!)

  if (context && VALID_CONTEXTS.includes(context)) {
    query = query.eq('context', context)
  }

  const { data, error } = await query.order('used_at', { ascending: false }).limit(10000)

  if (error || !data) return []

  const counts: Record<string, { actionId: string; context: string; count: number }> = {}
  for (const row of data as any[]) {
    const key = `${row.context}::${row.action_id}`
    if (!counts[key]) {
      counts[key] = { actionId: row.action_id, context: row.context, count: 0 }
    }
    counts[key].count++
  }

  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Get aggregate action bar summary across all contexts.
 */
export async function getActionBarSummary(): Promise<ActionBarSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get configs
  const { data: configs } = await db
    .from(CONFIGS_TABLE)
    .select('context')
    .eq('tenant_id', user.tenantId!)

  const configItems: any[] = configs ?? []
  const byContext: Record<string, number> = {}
  for (const row of configItems) {
    byContext[row.context] = (byContext[row.context] ?? 0) + 1
  }

  // Get usage
  const { data: usage } = await db
    .from(USAGE_TABLE)
    .select('action_id')
    .eq('tenant_id', user.tenantId!)

  const usageItems: any[] = usage ?? []
  const actionCounts: Record<string, number> = {}
  for (const row of usageItems) {
    actionCounts[row.action_id] = (actionCounts[row.action_id] ?? 0) + 1
  }

  const sorted = Object.entries(actionCounts)
    .map(([actionId, count]) => ({ actionId, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalConfigs: configItems.length,
    byContext,
    mostUsedActions: sorted.slice(0, 10),
    leastUsedActions: sorted.slice(-10).reverse(),
  }
}

/**
 * Return sensible default action bar items for a context.
 */
export async function getDefaultActionBar(
  context: ActionBarContext
): Promise<ActionBarConfig> {
  const user = await requireChef()
  return buildDefaultConfig(user.tenantId!, context)
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

function buildDefaultConfig(
  tenantId: string,
  context: ActionBarContext,
  lifecycleStage?: string
): ActionBarConfig {
  const now = new Date().toISOString()
  return {
    id: '',
    tenantId,
    context,
    items: getDefaultItems(context),
    lifecycleStage: lifecycleStage ?? null,
    createdAt: now,
    updatedAt: now,
  }
}

function getDefaultItems(context: ActionBarContext): ActionBarItem[] {
  switch (context) {
    case 'event_detail':
      return [
        { id: 'edit_event', label: 'Edit Event', variant: 'primary', order: 1 },
        { id: 'send_proposal', label: 'Send Proposal', variant: 'secondary', order: 2 },
        { id: 'add_note', label: 'Add Note', variant: 'ghost', order: 3 },
        { id: 'cancel_event', label: 'Cancel', variant: 'danger', order: 4 },
      ]
    case 'client_detail':
      return [
        { id: 'new_event', label: 'New Event', variant: 'primary', order: 1 },
        { id: 'send_message', label: 'Message', variant: 'secondary', order: 2 },
        { id: 'view_history', label: 'History', variant: 'ghost', order: 3 },
      ]
    case 'menu_editor':
      return [
        { id: 'save_menu', label: 'Save', variant: 'primary', order: 1 },
        { id: 'preview_menu', label: 'Preview', variant: 'secondary', order: 2 },
        { id: 'duplicate_menu', label: 'Duplicate', variant: 'ghost', order: 3 },
      ]
    case 'dashboard':
      return [
        { id: 'new_event', label: 'New Event', variant: 'primary', order: 1 },
        { id: 'new_client', label: 'New Client', variant: 'secondary', order: 2 },
        { id: 'quick_invoice', label: 'Invoice', variant: 'ghost', order: 3 },
      ]
    case 'calendar':
      return [
        { id: 'new_event', label: 'New Event', variant: 'primary', order: 1 },
        { id: 'block_time', label: 'Block Time', variant: 'secondary', order: 2 },
      ]
    case 'finance':
      return [
        { id: 'new_invoice', label: 'New Invoice', variant: 'primary', order: 1 },
        { id: 'record_payment', label: 'Record Payment', variant: 'secondary', order: 2 },
        { id: 'view_report', label: 'Report', variant: 'ghost', order: 3 },
      ]
    case 'settings':
      return [
        { id: 'save_settings', label: 'Save', variant: 'primary', order: 1 },
        { id: 'reset_defaults', label: 'Reset', variant: 'danger', order: 2 },
      ]
    default:
      return []
  }
}
