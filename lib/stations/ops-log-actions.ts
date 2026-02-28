// Station Clipboard System — Operations Log Actions
// Chef-only. Append-only operations log for audit trail of all station activities.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Database } from '@/types/database'

type OpsLogAction = Database['public']['Enums']['ops_log_action']

const OPS_LOG_ACTIONS: [OpsLogAction, ...OpsLogAction[]] = [
  'check_in',
  'check_out',
  'prep_complete',
  'stock_update',
  'order_request',
  'delivery_received',
  'waste',
  'eighty_six',
]

// ============================================
// SCHEMAS
// ============================================

const AppendOpsLogSchema = z.object({
  station_id: z.string().uuid().nullable().optional(),
  staff_member_id: z.string().uuid().nullable().optional(),
  action_type: z.enum(OPS_LOG_ACTIONS),
  details: z.record(z.string(), z.unknown()).default({}),
})

const OpsLogFilterSchema = z.object({
  station_id: z.string().uuid().optional(),
  action_type: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(50),
})

export type AppendOpsLogInput = z.infer<typeof AppendOpsLogSchema>
export type OpsLogFilterInput = z.infer<typeof OpsLogFilterSchema>

// ============================================
// OPS LOG
// ============================================

/**
 * Append an entry to the operations log. This is append-only — entries are never modified or deleted.
 */
export async function appendOpsLog(input: AppendOpsLogInput) {
  const user = await requireChef()
  const validated = AppendOpsLogSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('ops_log')
    .insert({
      chef_id: user.tenantId!,
      station_id: validated.station_id ?? null,
      staff_member_id: validated.staff_member_id ?? null,
      action_type: validated.action_type,
      details: validated.details as any,
    })
    .select()
    .single()

  if (error) {
    console.error('[appendOpsLog] Error:', error)
    throw new Error('Failed to append ops log entry')
  }

  return data
}

/**
 * Get paginated, filterable ops log entries.
 */
export async function getOpsLog(filters?: OpsLogFilterInput) {
  const user = await requireChef()
  const validated = OpsLogFilterSchema.parse(filters ?? {})
  const supabase: any = createServerClient()

  const offset = (validated.page - 1) * validated.per_page

  let query = supabase
    .from('ops_log')
    .select(
      `
      *,
      stations (id, name)
    `,
      { count: 'exact' }
    )
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .range(offset, offset + validated.per_page - 1)

  if (validated.station_id) {
    query = query.eq('station_id', validated.station_id)
  }

  if (validated.action_type) {
    query = query.eq('action_type', validated.action_type as OpsLogAction)
  }

  if (validated.start_date) {
    query = query.gte('created_at', `${validated.start_date}T00:00:00`)
  }

  if (validated.end_date) {
    query = query.lte('created_at', `${validated.end_date}T23:59:59`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[getOpsLog] Error:', error)
    throw new Error('Failed to load ops log')
  }

  return {
    entries: data ?? [],
    total: count ?? 0,
    page: validated.page,
    per_page: validated.per_page,
    total_pages: Math.ceil((count ?? 0) / validated.per_page),
  }
}

/**
 * Get distinct action types used in ops log (for filter dropdowns).
 */
export async function getOpsLogActionTypes() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('ops_log')
    .select('action_type')
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[getOpsLogActionTypes] Error:', error)
    return []
  }

  // Deduplicate
  const unique = [...new Set((data ?? []).map((d: any) => d.action_type))]
  return unique.sort()
}
