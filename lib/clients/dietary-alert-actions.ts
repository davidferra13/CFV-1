'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ─────────────────────────────────────

type ChangeType =
  | 'allergy_added'
  | 'allergy_removed'
  | 'restriction_added'
  | 'restriction_removed'
  | 'preference_updated'
  | 'note_updated'

type Severity = 'critical' | 'warning' | 'info'

export type DietaryAlert = {
  id: string
  chef_id: string
  client_id: string
  change_type: ChangeType
  field_name: string
  old_value: string | null
  new_value: string | null
  severity: Severity | null
  acknowledged: boolean
  created_at: string
  client_name?: string
}

export type DietaryTrend = {
  value: string
  count: number
  change_type: ChangeType
  recent_count: number // count in last 90 days
}

export type AlertStats = {
  total: number
  unacknowledged: number
  critical: number
  warning: number
  info: number
}

// ─── Severity classification (deterministic) ──

function classifySeverity(changeType: ChangeType): Severity {
  if (changeType === 'allergy_added' || changeType === 'allergy_removed') {
    return 'critical'
  }
  if (changeType === 'restriction_added' || changeType === 'restriction_removed') {
    return 'warning'
  }
  return 'info'
}

// ─── Actions ───────────────────────────────────

export async function getDietaryAlerts(unacknowledgedOnly = false): Promise<DietaryAlert[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('dietary_change_log')
    .select('*, client:clients(full_name)')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(200)

  if (unacknowledgedOnly) {
    query = query.eq('acknowledged', false)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getDietaryAlerts] Error:', error)
    throw new Error('Failed to fetch dietary alerts')
  }

  return (data || []).map((row: Record<string, unknown>) => {
    const client = row.client as { full_name: string } | null
    return {
      id: row.id as string,
      chef_id: row.chef_id as string,
      client_id: row.client_id as string,
      change_type: row.change_type as ChangeType,
      field_name: row.field_name as string,
      old_value: row.old_value as string | null,
      new_value: row.new_value as string | null,
      severity: row.severity as Severity | null,
      acknowledged: row.acknowledged as boolean,
      created_at: row.created_at as string,
      client_name: client?.full_name ?? 'Unknown',
    }
  })
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('dietary_change_log')
    .update({ acknowledged: true })
    .eq('id', alertId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[acknowledgeAlert] Error:', error)
    throw new Error('Failed to acknowledge alert')
  }
}

export async function acknowledgeAllAlerts(): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('dietary_change_log')
    .update({ acknowledged: true })
    .eq('chef_id', user.tenantId!)
    .eq('acknowledged', false)

  if (error) {
    console.error('[acknowledgeAllAlerts] Error:', error)
    throw new Error('Failed to acknowledge all alerts')
  }
}

export async function logDietaryChange(
  clientId: string,
  changeType: ChangeType,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null
): Promise<void> {
  const user = await requireChef()
  await logDietaryChangeInternal(
    user.tenantId!,
    clientId,
    changeType,
    fieldName,
    oldValue,
    newValue
  )
}

/**
 * Q9: Internal variant for non-chef paths (onboarding, intake, instant-book, AI detection).
 * Same logic as logDietaryChange but takes tenantId directly instead of requiring chef session.
 */
export async function logDietaryChangeInternal(
  tenantId: string,
  clientId: string,
  changeType: ChangeType,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null
): Promise<void> {
  const db: any = createServerClient()
  const severity = classifySeverity(changeType)

  const { error } = await db.from('dietary_change_log').insert({
    chef_id: tenantId,
    client_id: clientId,
    change_type: changeType,
    field_name: fieldName,
    old_value: oldValue,
    new_value: newValue,
    severity,
  })

  if (error) {
    console.error('[logDietaryChangeInternal] Error:', error)
  }
}

export async function getDietaryTrends(): Promise<{
  commonAllergies: DietaryTrend[]
  commonRestrictions: DietaryTrend[]
  risingTrends: DietaryTrend[]
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch all dietary changes for this chef
  const { data, error } = await db
    .from('dietary_change_log')
    .select('change_type, field_name, new_value, created_at')
    .eq('chef_id', user.tenantId!)
    .in('change_type', ['allergy_added', 'restriction_added', 'preference_updated'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getDietaryTrends] Error:', error)
    throw new Error('Failed to fetch dietary trends')
  }

  const rows = data || []
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000

  // Aggregate by new_value for allergy and restriction adds
  const allergyMap = new Map<string, { count: number; recent: number }>()
  const restrictionMap = new Map<string, { count: number; recent: number }>()

  for (const row of rows) {
    const value = (row.new_value || row.field_name || '').toLowerCase().trim()
    if (!value) continue

    const isRecent = new Date(row.created_at).getTime() > ninetyDaysAgo

    if (row.change_type === 'allergy_added') {
      const entry = allergyMap.get(value) || { count: 0, recent: 0 }
      entry.count++
      if (isRecent) entry.recent++
      allergyMap.set(value, entry)
    } else if (row.change_type === 'restriction_added') {
      const entry = restrictionMap.get(value) || { count: 0, recent: 0 }
      entry.count++
      if (isRecent) entry.recent++
      restrictionMap.set(value, entry)
    }
  }

  const commonAllergies: DietaryTrend[] = Array.from(allergyMap.entries())
    .map(([value, stats]) => ({
      value,
      count: stats.count,
      change_type: 'allergy_added' as ChangeType,
      recent_count: stats.recent,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const commonRestrictions: DietaryTrend[] = Array.from(restrictionMap.entries())
    .map(([value, stats]) => ({
      value,
      count: stats.count,
      change_type: 'restriction_added' as ChangeType,
      recent_count: stats.recent,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Rising trends: items where recent_count is disproportionately high
  const allItems = [...commonAllergies, ...commonRestrictions]
  const risingTrends = allItems
    .filter((item) => item.recent_count >= 2)
    .sort((a, b) => b.recent_count - a.recent_count)
    .slice(0, 5)

  return { commonAllergies, commonRestrictions, risingTrends }
}

export async function getClientDietaryTimeline(clientId: string): Promise<DietaryAlert[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('dietary_change_log')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[getClientDietaryTimeline] Error:', error)
    throw new Error('Failed to fetch client dietary timeline')
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    chef_id: row.chef_id as string,
    client_id: row.client_id as string,
    change_type: row.change_type as ChangeType,
    field_name: row.field_name as string,
    old_value: row.old_value as string | null,
    new_value: row.new_value as string | null,
    severity: row.severity as Severity | null,
    acknowledged: row.acknowledged as boolean,
    created_at: row.created_at as string,
  }))
}

export async function getAlertStats(): Promise<AlertStats> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('dietary_change_log')
    .select('severity, acknowledged')
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[getAlertStats] Error:', error)
    throw new Error('Failed to fetch alert stats')
  }

  const rows = data || []

  return {
    total: rows.length,
    unacknowledged: rows.filter((r: Record<string, unknown>) => !r.acknowledged).length,
    critical: rows.filter((r: Record<string, unknown>) => r.severity === 'critical').length,
    warning: rows.filter((r: Record<string, unknown>) => r.severity === 'warning').length,
    info: rows.filter((r: Record<string, unknown>) => r.severity === 'info').length,
  }
}
