'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertPosRoleAccess } from './pos-authorization'
import {
  computePosDailyMetricSnapshot,
  normalizePosAlertSeverity,
  normalizePosAlertStatus,
  type PosAlertSeverity,
  type PosAlertStatus,
} from './observability-core'

export type RecordPosAlertInput = {
  tenantId: string
  source: string
  eventType: string
  severity: PosAlertSeverity
  message: string
  dedupeKey?: string | null
  context?: Record<string, unknown> | null
}

export type PosAlertRow = {
  id: string
  createdAt: string
  updatedAt: string
  firstSeenAt: string
  lastSeenAt: string
  occurrenceCount: number
  source: string
  eventType: string
  severity: PosAlertSeverity
  status: PosAlertStatus
  message: string
  dedupeKey: string | null
  context: Record<string, unknown>
  acknowledgedAt: string | null
  resolvedAt: string | null
}

export type PosMetricSnapshotRow = {
  id: string
  snapshotDate: string
  generatedAt: string
  totalSalesCount: number
  grossRevenueCents: number
  netRevenueCents: number
  refundsCents: number
  voidedSalesCount: number
  cashVarianceCents: number
  openAlertCount: number
  errorAlertCount: number
  warningAlertCount: number
}

function toIsoDayString(raw: string | undefined) {
  const date = String(raw ?? '').trim()
  if (!date) return new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Date must be in YYYY-MM-DD format')
  }
  return date
}

function parseAlertRow(row: Record<string, unknown>): PosAlertRow {
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    firstSeenAt: String(row.first_seen_at ?? row.created_at),
    lastSeenAt: String(row.last_seen_at ?? row.created_at),
    occurrenceCount: Number(row.occurrence_count ?? 1),
    source: String(row.source ?? 'pos'),
    eventType: String(row.event_type ?? 'unknown'),
    severity: normalizePosAlertSeverity(row.severity),
    status: normalizePosAlertStatus(row.status),
    message: String(row.message ?? ''),
    dedupeKey: row.dedupe_key ? String(row.dedupe_key) : null,
    context: (row.context ?? {}) as Record<string, unknown>,
    acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : null,
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
  }
}

function parseMetricSnapshotRow(row: Record<string, unknown>): PosMetricSnapshotRow {
  return {
    id: String(row.id),
    snapshotDate: String(row.snapshot_date ?? ''),
    generatedAt: String(row.generated_at ?? ''),
    totalSalesCount: Number(row.total_sales_count ?? 0),
    grossRevenueCents: Number(row.gross_revenue_cents ?? 0),
    netRevenueCents: Number(row.net_revenue_cents ?? 0),
    refundsCents: Number(row.refunds_cents ?? 0),
    voidedSalesCount: Number(row.voided_sales_count ?? 0),
    cashVarianceCents: Number(row.cash_variance_cents ?? 0),
    openAlertCount: Number(row.open_alert_count ?? 0),
    errorAlertCount: Number(row.error_alert_count ?? 0),
    warningAlertCount: Number(row.warning_alert_count ?? 0),
  }
}

function severityRank(value: PosAlertSeverity) {
  if (value === 'critical') return 4
  if (value === 'error') return 3
  if (value === 'warning') return 2
  return 1
}

function pickHigherSeverity(left: PosAlertSeverity, right: PosAlertSeverity): PosAlertSeverity {
  return severityRank(left) >= severityRank(right) ? left : right
}

export async function recordPosAlert(alert: RecordPosAlertInput) {
  const supabase: any = createServerClient()
  const nowIso = new Date().toISOString()
  const severity = normalizePosAlertSeverity(alert.severity)
  const dedupeKey = String(alert.dedupeKey ?? '').trim() || null

  try {
    if (dedupeKey) {
      const { data: existing } = await (supabase
        .from('pos_alert_events' as any)
        .select('id, occurrence_count, severity')
        .eq('tenant_id', alert.tenantId)
        .eq('status', 'open')
        .eq('dedupe_key', dedupeKey)
        .maybeSingle() as any)

      if (existing?.id) {
        await (supabase
          .from('pos_alert_events' as any)
          .update({
            message: alert.message,
            severity: pickHigherSeverity(
              normalizePosAlertSeverity(existing.severity),
              normalizePosAlertSeverity(severity)
            ),
            context: alert.context ?? {},
            last_seen_at: nowIso,
            occurrence_count: Number(existing.occurrence_count ?? 1) + 1,
          } as any)
          .eq('id', existing.id)
          .eq('tenant_id', alert.tenantId) as any)
        return
      }
    }

    await (supabase.from('pos_alert_events' as any).insert({
      tenant_id: alert.tenantId,
      source: alert.source,
      event_type: alert.eventType,
      severity,
      status: 'open',
      message: alert.message,
      dedupe_key: dedupeKey,
      context: alert.context ?? {},
      first_seen_at: nowIso,
      last_seen_at: nowIso,
      occurrence_count: 1,
    } as any) as any)
  } catch (error) {
    console.error('[non-blocking] Failed to record POS alert:', error)
  }
}

export async function listPosAlerts(input?: {
  limit?: number
  status?: PosAlertStatus
  severity?: PosAlertSeverity
}): Promise<PosAlertRow[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const limit =
    Number.isInteger(input?.limit) && (input?.limit as number) > 0
      ? Math.min(200, input?.limit as number)
      : 100

  let query = supabase
    .from('pos_alert_events' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(limit) as any

  if (input?.status) query = query.eq('status', input.status)
  if (input?.severity) query = query.eq('severity', input.severity)

  const { data, error } = await query
  if (error) throw new Error(`Failed to list POS alerts: ${error.message}`)
  return (data ?? []).map((row: unknown) => parseAlertRow((row ?? {}) as Record<string, unknown>))
}

export async function acknowledgePosAlert(alertId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()
  await assertPosRoleAccess({
    supabase,
    user,
    action: 'acknowledge POS alerts',
    requiredLevel: 'lead',
  })

  const { error } = await (supabase
    .from('pos_alert_events' as any)
    .update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: user.id,
    } as any)
    .eq('id', alertId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to acknowledge alert: ${error.message}`)
  revalidatePath('/commerce/observability')
}

export async function resolvePosAlert(alertId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()
  await assertPosRoleAccess({
    supabase,
    user,
    action: 'resolve POS alerts',
    requiredLevel: 'lead',
  })

  const now = new Date().toISOString()
  const { error } = await (supabase
    .from('pos_alert_events' as any)
    .update({
      status: 'resolved',
      resolved_at: now,
      resolved_by: user.id,
      acknowledged_at: now,
      acknowledged_by: user.id,
    } as any)
    .eq('id', alertId)
    .eq('tenant_id', user.tenantId!) as any)

  if (error) throw new Error(`Failed to resolve alert: ${error.message}`)
  revalidatePath('/commerce/observability')
}

export async function captureDailyPosMetrics(input?: { date?: string }) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()
  await assertPosRoleAccess({
    supabase,
    user,
    action: 'capture POS metric snapshots',
    requiredLevel: 'lead',
  })
  const day = toIsoDayString(input?.date)
  const fromIso = `${day}T00:00:00.000Z`
  const toIso = `${day}T23:59:59.999Z`

  const [salesRes, refundsRes, sessionsRes, alertsRes] = await Promise.all([
    supabase
      .from('sales')
      .select('status, total_cents')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', fromIso)
      .lte('created_at', toIso),
    supabase
      .from('commerce_refunds')
      .select('amount_cents')
      .eq('tenant_id', user.tenantId!)
      .eq('status', 'processed')
      .gte('created_at', fromIso)
      .lte('created_at', toIso),
    supabase
      .from('register_sessions')
      .select('cash_variance_cents')
      .eq('tenant_id', user.tenantId!)
      .eq('status', 'closed')
      .gte('closed_at', fromIso)
      .lte('closed_at', toIso),
    supabase
      .from('pos_alert_events' as any)
      .select('status, severity')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', fromIso)
      .lte('created_at', toIso),
  ])

  const snapshot = computePosDailyMetricSnapshot({
    sales: salesRes.data ?? [],
    refunds: refundsRes.data ?? [],
    sessions: sessionsRes.data ?? [],
    alerts: alertsRes.data ?? [],
  })

  const { error } = await (supabase.from('pos_metric_snapshots' as any).upsert(
    {
      tenant_id: user.tenantId!,
      snapshot_date: day,
      generated_at: new Date().toISOString(),
      total_sales_count: snapshot.totalSalesCount,
      gross_revenue_cents: snapshot.grossRevenueCents,
      net_revenue_cents: snapshot.netRevenueCents,
      refunds_cents: snapshot.refundsCents,
      voided_sales_count: snapshot.voidedSalesCount,
      cash_variance_cents: snapshot.cashVarianceCents,
      open_alert_count: snapshot.openAlertCount,
      error_alert_count: snapshot.errorAlertCount,
      warning_alert_count: snapshot.warningAlertCount,
    } as any,
    { onConflict: 'tenant_id,snapshot_date' }
  ) as any)

  if (error) throw new Error(`Failed to capture POS metrics: ${error.message}`)
  revalidatePath('/commerce/observability')

  return {
    date: day,
    snapshot,
  }
}

export async function listPosMetricSnapshots(input?: {
  limit?: number
}): Promise<PosMetricSnapshotRow[]> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()
  const limit =
    Number.isInteger(input?.limit) && (input?.limit as number) > 0
      ? Math.min(90, input?.limit as number)
      : 30

  const { data, error } = await (supabase
    .from('pos_metric_snapshots' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('snapshot_date', { ascending: false })
    .limit(limit) as any)

  if (error) throw new Error(`Failed to list POS metric snapshots: ${error.message}`)
  return (data ?? []).map((row: unknown) =>
    parseMetricSnapshotRow((row ?? {}) as Record<string, unknown>)
  )
}
