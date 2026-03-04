// Commerce Engine V1 — Register Session Actions
// POS shift management: open/close/suspend register, track cash drawer.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RegisterSessionStatus } from './constants'
import { computeRegisterSessionTotals } from './register-metrics'
import { appendPosAuditLog } from './pos-audit-log'
import { assertPosManagerAccess, assertPosRoleAccess } from './pos-authorization'
import { generateDailyReconciliation } from './reconciliation-actions'
import { captureDailyPosMetrics, recordPosAlert } from './observability-actions'

// ─── Types ────────────────────────────────────────────────────────

export type OpenRegisterInput = {
  sessionName?: string
  openingCashCents: number
}

const ACTIVE_REGISTER_STATUSES: RegisterSessionStatus[] = ['open', 'suspended']

function isUniqueViolation(error: unknown) {
  const code = (error as { code?: string } | null)?.code
  return code === '23505'
}

function readPositiveInt(value: string | undefined, fallback: number) {
  if (value == null) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return parsed
}

const CLOSE_VARIANCE_REASON_THRESHOLD_CENTS = readPositiveInt(
  process.env.POS_CLOSE_REASON_THRESHOLD_CENTS,
  500
)

async function emitRegisterAlert(input: {
  tenantScopeId: string
  eventType: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  dedupeKey?: string
  context?: Record<string, unknown>
}) {
  try {
    await recordPosAlert({
      tenantId: input.tenantScopeId,
      source: 'register',
      eventType: input.eventType,
      severity: input.severity,
      message: input.message,
      dedupeKey: input.dedupeKey,
      context: input.context ?? {},
    })
  } catch (error) {
    console.error('[non-blocking] Failed to emit register alert:', error)
  }
}

async function reconcileActiveRegisterSessionsAfterOpen(ctx: {
  supabase: any
  tenantId: string
  openedSessionId: string
}) {
  const { data: activeRows, error } = await (ctx.supabase
    .from('register_sessions' as any)
    .select('id, opened_at, created_at')
    .eq('tenant_id', ctx.tenantId)
    .in('status', ACTIVE_REGISTER_STATUSES as any)
    .order('opened_at', { ascending: true })
    .order('created_at', { ascending: true }) as any)

  if (error) {
    throw new Error(`Failed to verify active register sessions: ${error.message}`)
  }

  const active = (activeRows ?? []).map((row: any) => String(row.id)).filter(Boolean)
  if (active.length <= 1) {
    return
  }

  const winnerId = active[0]
  const closedAtIso = new Date().toISOString()

  if (winnerId !== ctx.openedSessionId) {
    await (ctx.supabase
      .from('register_sessions' as any)
      .update({
        status: 'closed',
        closed_at: closedAtIso,
        close_notes: 'auto-closed: concurrent register open race lost',
      } as any)
      .eq('tenant_id', ctx.tenantId)
      .eq('id', ctx.openedSessionId)
      .eq('status', 'open') as any)

    throw new Error('A register session is already active. Close it before opening a new one.')
  }

  const loserIds = active.slice(1).filter((id: string) => id !== winnerId)
  if (loserIds.length === 0) {
    return
  }

  await (ctx.supabase
    .from('register_sessions' as any)
    .update({
      status: 'closed',
      closed_at: closedAtIso,
      close_notes: 'auto-closed: concurrent register open race reconciliation',
    } as any)
    .eq('tenant_id', ctx.tenantId)
    .in('id', loserIds as any)
    .in('status', ACTIVE_REGISTER_STATUSES as any) as any)
}

// ─── Open Register ───────────────────────────────────────────────

/**
 * Open a new register session. Only one session can be open per tenant at a time.
 */
export async function openRegister(input: OpenRegisterInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  await assertPosRoleAccess({
    supabase,
    user,
    action: 'open the register',
    requiredLevel: 'lead',
  })

  if (!Number.isInteger(input.openingCashCents) || input.openingCashCents < 0) {
    throw new Error('Opening cash must be a non-negative integer (cents)')
  }

  // Check for existing open session
  const { data: existing } = await (supabase
    .from('register_sessions' as any)
    .select('id, status')
    .eq('tenant_id', user.tenantId!)
    .in('status', ACTIVE_REGISTER_STATUSES as any)
    .limit(1) as any)

  if (existing && existing.length > 0) {
    throw new Error('A register session is already active. Close it before opening a new one.')
  }

  const { data, error } = await (supabase
    .from('register_sessions' as any)
    .insert({
      tenant_id: user.tenantId!,
      session_name: input.sessionName ?? null,
      status: 'open',
      opened_by: user.id,
      opening_cash_cents: input.openingCashCents,
    } as any)
    .select('id, session_name, opened_at')
    .single() as any)

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error('A register session is already active. Close it before opening a new one.')
    }
    throw new Error(`Failed to open register: ${error.message}`)
  }

  await reconcileActiveRegisterSessionsAfterOpen({
    supabase,
    tenantId: user.tenantId!,
    openedSessionId: data.id,
  })

  await appendPosAuditLog({
    tenantId: user.tenantId!,
    action: 'register_opened',
    tableName: 'register_sessions',
    recordId: data.id,
    changedBy: user.id,
    summary: 'POS register opened',
    afterValues: {
      opening_cash_cents: input.openingCashCents,
      session_name: input.sessionName ?? null,
      status: 'open',
    },
  })

  revalidatePath('/commerce')
  return data
}

// ─── Suspend Register ────────────────────────────────────────────

export async function suspendRegister(sessionId: string, notes?: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  await assertPosRoleAccess({
    supabase,
    user,
    action: 'suspend the register',
    requiredLevel: 'lead',
  })

  const { data: updated, error } = await (supabase
    .from('register_sessions' as any)
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      notes: notes ?? null,
    } as any)
    .eq('id', sessionId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'open')
    .select('id')
    .maybeSingle() as any)

  if (error) throw new Error(`Failed to suspend register: ${error.message}`)
  if (!updated) throw new Error('Register session is not open or no longer available')

  await appendPosAuditLog({
    tenantId: user.tenantId!,
    action: 'register_suspended',
    tableName: 'register_sessions',
    recordId: sessionId,
    changedBy: user.id,
    summary: 'POS register suspended',
    afterValues: {
      status: 'suspended',
      notes: notes ?? null,
    },
  })

  revalidatePath('/commerce')
}

// ─── Resume Register ─────────────────────────────────────────────

export async function resumeRegister(sessionId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  await assertPosRoleAccess({
    supabase,
    user,
    action: 'resume the register',
    requiredLevel: 'lead',
  })

  const { data: openSession } = await (supabase
    .from('register_sessions' as any)
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'open')
    .neq('id', sessionId)
    .limit(1)
    .maybeSingle() as any)

  if (openSession) {
    throw new Error('Another register session is already open. Close or suspend it first.')
  }

  const { data: updated, error } = await (supabase
    .from('register_sessions' as any)
    .update({
      status: 'open',
      suspended_at: null,
    } as any)
    .eq('id', sessionId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'suspended')
    .select('id')
    .maybeSingle() as any)

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error('Another register session is already open. Close or suspend it first.')
    }
    throw new Error(`Failed to resume register: ${error.message}`)
  }
  if (!updated) throw new Error('Register session is not suspended or no longer available')

  await appendPosAuditLog({
    tenantId: user.tenantId!,
    action: 'register_resumed',
    tableName: 'register_sessions',
    recordId: sessionId,
    changedBy: user.id,
    summary: 'POS register resumed',
    afterValues: {
      status: 'open',
    },
  })

  revalidatePath('/commerce')
}

// ─── Close Register ──────────────────────────────────────────────

export async function closeRegister(
  sessionId: string,
  closingCashCents: number,
  closeNotes?: string
) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  await assertPosManagerAccess({
    supabase,
    user,
    action: 'close the register',
  })

  if (!Number.isInteger(closingCashCents) || closingCashCents < 0) {
    throw new Error('Closing cash must be a non-negative integer (cents)')
  }

  // Fetch session to compute expected cash
  const { data: session, error: fetchErr } = await (supabase
    .from('register_sessions' as any)
    .select('opening_cash_cents, total_revenue_cents, total_tips_cents, status')
    .eq('id', sessionId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (fetchErr || !session) throw new Error('Register session not found')
  if ((session as any).status === 'closed') {
    throw new Error('Register session is already closed')
  }
  if (!['open', 'suspended'].includes(String((session as any).status ?? ''))) {
    throw new Error('Register session must be open or suspended before closing')
  }

  // Get sales linked to this session
  const { data: sessionSales } = await (supabase
    .from('sales')
    .select('id, status')
    .eq('register_session_id', sessionId)
    .eq('tenant_id', user.tenantId!) as any)

  const inFlightStatuses = new Set(['draft', 'pending_payment', 'authorized'])
  const inFlightSales = (sessionSales ?? []).filter((sale: any) =>
    inFlightStatuses.has(String(sale.status ?? ''))
  )
  if (inFlightSales.length > 0) {
    await emitRegisterAlert({
      tenantScopeId: user.tenantId!,
      eventType: 'register_close_blocked_in_flight',
      severity: 'warning',
      message: `Register close blocked because ${inFlightSales.length} sale(s) are still in progress`,
      dedupeKey: `register_close_blocked_${sessionId}`,
      context: {
        register_session_id: sessionId,
        in_flight_sales_count: inFlightSales.length,
      },
    })
    throw new Error(
      `Cannot close register while ${inFlightSales.length} sale${inFlightSales.length === 1 ? '' : 's'} are still in progress`
    )
  }

  const saleIds = (sessionSales ?? []).map((sale: any) => sale.id).filter(Boolean)

  // Pull payments only for this session's sales
  let sessionPayments: any[] = []
  if (saleIds.length > 0) {
    const { data } = await (supabase
      .from('commerce_payments')
      .select('sale_id, amount_cents, tip_cents, status')
      .eq('tenant_id', user.tenantId!)
      .in('sale_id', saleIds) as any)
    sessionPayments = data ?? []
  }

  // Expected cash is now derived from itemized drawer movements.
  const { data: movements } = await (supabase
    .from('cash_drawer_movements' as any)
    .select('amount_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('register_session_id', sessionId) as any)

  const movementNet = (movements ?? []).reduce((sum: number, m: any) => sum + m.amount_cents, 0)
  const expectedCash = (session as any).opening_cash_cents + movementNet
  const variance = closingCashCents - expectedCash
  const normalizedCloseNotes = closeNotes?.trim() ?? ''

  if (Math.abs(variance) > CLOSE_VARIANCE_REASON_THRESHOLD_CENTS && !normalizedCloseNotes) {
    throw new Error(
      `Close note is required when cash variance exceeds ${CLOSE_VARIANCE_REASON_THRESHOLD_CENTS / 100} dollars`
    )
  }

  const totals = computeRegisterSessionTotals({
    sales: sessionSales ?? [],
    payments: sessionPayments,
  })
  const closedAtIso = new Date().toISOString()

  const { data: updated, error } = await (supabase
    .from('register_sessions' as any)
    .update({
      status: 'closed',
      closed_at: closedAtIso,
      closed_by: user.id,
      closing_cash_cents: closingCashCents,
      expected_cash_cents: expectedCash,
      cash_variance_cents: variance,
      total_sales_count: totals.totalSalesCount,
      total_revenue_cents: totals.totalRevenueCents,
      total_tips_cents: totals.totalTipsCents,
      close_notes: normalizedCloseNotes || null,
    } as any)
    .eq('id', sessionId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', (session as any).status)
    .select('id')
    .maybeSingle() as any)

  if (error) throw new Error(`Failed to close register: ${error.message}`)
  if (!updated) {
    throw new Error('Register session state changed while closing. Refresh and try again.')
  }

  await appendPosAuditLog({
    tenantId: user.tenantId!,
    action: 'register_closed',
    tableName: 'register_sessions',
    recordId: sessionId,
    changedBy: user.id,
    summary: 'POS register closed',
    afterValues: {
      closing_cash_cents: closingCashCents,
      expected_cash_cents: expectedCash,
      cash_variance_cents: variance,
      close_notes: normalizedCloseNotes || null,
      status: 'closed',
    },
  })

  if (Math.abs(variance) > CLOSE_VARIANCE_REASON_THRESHOLD_CENTS) {
    await emitRegisterAlert({
      tenantScopeId: user.tenantId!,
      eventType: 'register_close_high_variance',
      severity: Math.abs(variance) >= 2500 ? 'error' : 'warning',
      message: `Register closed with cash variance ${variance >= 0 ? '+' : ''}$${(variance / 100).toFixed(2)}`,
      dedupeKey: `register_close_variance_${sessionId}_${closedAtIso.slice(0, 10)}`,
      context: {
        register_session_id: sessionId,
        expected_cash_cents: expectedCash,
        closing_cash_cents: closingCashCents,
        cash_variance_cents: variance,
      },
    })
  }

  try {
    await generateDailyReconciliation({ referenceTimestamp: closedAtIso })
  } catch (error) {
    console.error(
      '[non-blocking] Failed to generate daily reconciliation after register close:',
      error
    )
    await emitRegisterAlert({
      tenantScopeId: user.tenantId!,
      eventType: 'reconciliation_auto_generate_failed',
      severity: 'error',
      message: 'Register closed but daily reconciliation auto-generation failed',
      dedupeKey: `reconciliation_auto_generate_failed_${closedAtIso.slice(0, 10)}`,
      context: {
        register_session_id: sessionId,
      },
    })
  }

  try {
    await captureDailyPosMetrics({ date: closedAtIso.slice(0, 10) })
  } catch (error) {
    console.error('[non-blocking] Failed to capture daily POS metrics after register close:', error)
    await emitRegisterAlert({
      tenantScopeId: user.tenantId!,
      eventType: 'pos_metrics_capture_failed',
      severity: 'warning',
      message: 'Register closed but daily POS metrics capture failed',
      dedupeKey: `pos_metrics_capture_failed_${closedAtIso.slice(0, 10)}`,
      context: {
        register_session_id: sessionId,
      },
    })
  }

  revalidatePath('/commerce')
  return {
    expectedCash,
    closingCashCents,
    variance,
    totalSales: totals.totalSalesCount,
    totalRevenue: totals.totalRevenueCents,
  }
}

// ─── Get Current Session ─────────────────────────────────────────

export async function getCurrentRegisterSession() {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data, error } = await (supabase
    .from('register_sessions' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['open', 'suspended'])
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle() as any)

  if (error) throw new Error(`Failed to fetch register session: ${error.message}`)
  return data
}

// ─── Get Session History ─────────────────────────────────────────

export async function getRegisterSessionHistory(filters?: {
  limit?: number
  offset?: number
  status?: RegisterSessionStatus
}) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  let query = supabase
    .from('register_sessions' as any)
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenantId!)
    .order('opened_at', { ascending: false }) as any

  if (filters?.status) query = query.eq('status', filters.status)

  if (filters?.limit) {
    const from = filters.offset ?? 0
    query = query.range(from, from + filters.limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`Failed to fetch session history: ${error.message}`)

  return { sessions: data ?? [], total: count ?? 0 }
}

// ─── Get Session By ID ───────────────────────────────────────────

export async function getRegisterSession(sessionId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data, error } = await (supabase
    .from('register_sessions' as any)
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (error) throw new Error(`Register session not found: ${error.message}`)
  return data
}
