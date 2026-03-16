'use server'

// Server actions for the /admin/silent-failures dashboard.
// Read, dismiss, and cleanup side_effect_failures records.

import { requireAdmin } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SideEffectFailure {
  id: string
  created_at: string
  source: string
  operation: string
  severity: string
  entity_type: string | null
  entity_id: string | null
  tenant_id: string | null
  error_message: string | null
  context: Record<string, unknown>
  dismissed_at: string | null
  dismissed_by: string | null
}

export async function getSideEffectFailures(opts?: {
  limit?: number
  includeDismissed?: boolean
  source?: string
  severity?: string
}): Promise<{ failures: SideEffectFailure[]; total: number }> {
  await requireAdmin()
  const supabase: any = createServerClient({ admin: true })

  const limit = opts?.limit ?? 100

  let query = supabase
    .from('side_effect_failures')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!opts?.includeDismissed) {
    query = query.is('dismissed_at', null)
  }
  if (opts?.source) {
    query = query.eq('source', opts.source)
  }
  if (opts?.severity) {
    query = query.eq('severity', opts.severity)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[failure-actions] Failed to fetch side_effect_failures:', error)
    return { failures: [], total: 0 }
  }

  return { failures: data ?? [], total: count ?? 0 }
}

export async function getFailureSources(): Promise<string[]> {
  await requireAdmin()
  const supabase: any = createServerClient({ admin: true })

  const { data } = await supabase
    .from('side_effect_failures')
    .select('source')
    .is('dismissed_at', null)

  if (!data) return []

  const unique = [...new Set((data as { source: string }[]).map((r) => r.source))]
  return unique.sort()
}

export async function dismissFailure(id: string, adminEmail: string): Promise<void> {
  await requireAdmin()
  const supabase: any = createServerClient({ admin: true })

  const { error } = await supabase
    .from('side_effect_failures')
    .update({ dismissed_at: new Date().toISOString(), dismissed_by: adminEmail })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to dismiss: ${error.message}`)
  }

  revalidatePath('/admin/silent-failures')
}

export async function dismissAllBySource(source: string, adminEmail: string): Promise<number> {
  await requireAdmin()
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('side_effect_failures')
    .update({ dismissed_at: new Date().toISOString(), dismissed_by: adminEmail })
    .eq('source', source)
    .is('dismissed_at', null)
    .select('id')

  if (error) {
    throw new Error(`Failed to dismiss: ${error.message}`)
  }

  revalidatePath('/admin/silent-failures')
  return data?.length ?? 0
}

export async function getFailureSummary(): Promise<{
  total: number
  bySeverity: Record<string, number>
  bySource: { source: string; count: number }[]
}> {
  await requireAdmin()
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('side_effect_failures')
    .select('severity, source')
    .is('dismissed_at', null)

  if (error || !data) {
    return { total: 0, bySeverity: {}, bySource: [] }
  }

  const rows = data as { severity: string; source: string }[]
  const bySeverity: Record<string, number> = {}
  const sourceMap: Record<string, number> = {}

  for (const row of rows) {
    bySeverity[row.severity] = (bySeverity[row.severity] ?? 0) + 1
    sourceMap[row.source] = (sourceMap[row.source] ?? 0) + 1
  }

  const bySource = Object.entries(sourceMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  return { total: rows.length, bySeverity, bySource }
}
