// Commerce Engine V1 — Register Session Actions
// POS shift management: open/close/suspend register, track cash drawer.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { RegisterSessionStatus } from './constants'

// ─── Types ────────────────────────────────────────────────────────

export type OpenRegisterInput = {
  sessionName?: string
  openingCashCents: number
}

// ─── Open Register ───────────────────────────────────────────────

/**
 * Open a new register session. Only one session can be open per tenant at a time.
 */
export async function openRegister(input: OpenRegisterInput) {
  const user = await requireChef()
  const supabase = createServerClient()

  if (!Number.isInteger(input.openingCashCents) || input.openingCashCents < 0) {
    throw new Error('Opening cash must be a non-negative integer (cents)')
  }

  // Check for existing open session
  const { data: existing } = await supabase
    .from('register_sessions')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'open')
    .limit(1)

  if (existing && existing.length > 0) {
    throw new Error('A register session is already open. Close or suspend it first.')
  }

  const { data, error } = await supabase
    .from('register_sessions')
    .insert({
      tenant_id: user.tenantId!,
      session_name: input.sessionName ?? null,
      status: 'open',
      opened_by: user.id,
      opening_cash_cents: input.openingCashCents,
    } as any)
    .select('id, session_name, opened_at')
    .single()

  if (error) throw new Error(`Failed to open register: ${error.message}`)

  revalidatePath('/commerce')
  return data
}

// ─── Suspend Register ────────────────────────────────────────────

export async function suspendRegister(sessionId: string, notes?: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('register_sessions')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      notes: notes ?? null,
    } as any)
    .eq('id', sessionId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'open')

  if (error) throw new Error(`Failed to suspend register: ${error.message}`)

  revalidatePath('/commerce')
}

// ─── Resume Register ─────────────────────────────────────────────

export async function resumeRegister(sessionId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('register_sessions')
    .update({
      status: 'open',
      suspended_at: null,
    } as any)
    .eq('id', sessionId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'suspended')

  if (error) throw new Error(`Failed to resume register: ${error.message}`)

  revalidatePath('/commerce')
}

// ─── Close Register ──────────────────────────────────────────────

export async function closeRegister(
  sessionId: string,
  closingCashCents: number,
  closeNotes?: string
) {
  const user = await requireChef()
  const supabase = createServerClient()

  if (!Number.isInteger(closingCashCents) || closingCashCents < 0) {
    throw new Error('Closing cash must be a non-negative integer (cents)')
  }

  // Fetch session to compute expected cash
  const { data: session, error: fetchErr } = await supabase
    .from('register_sessions')
    .select('opening_cash_cents, total_revenue_cents, total_tips_cents, status')
    .eq('id', sessionId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !session) throw new Error('Register session not found')
  if ((session as any).status === 'closed') {
    throw new Error('Register session is already closed')
  }

  // Compute totals from actual cash sales during this session
  const { data: cashPayments } = await supabase
    .from('commerce_payments')
    .select('amount_cents, tip_cents')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['captured', 'settled'])
    .eq('payment_method', 'cash')

  // Get sales linked to this session to filter payments
  const { data: sessionSales } = await supabase
    .from('sales')
    .select('id')
    .eq('register_session_id', sessionId)
    .eq('tenant_id', user.tenantId!)

  const sessionSaleIds = new Set((sessionSales ?? []).map((s: any) => s.id))

  // Filter to only payments for this session's sales
  // (cashPayments is broader — we need to match by sale_id)
  const { data: sessionPayments } = await supabase
    .from('commerce_payments')
    .select('amount_cents, tip_cents, payment_method, sale_id')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['captured', 'settled'])

  let cashInFromSales = 0
  for (const p of sessionPayments ?? []) {
    if (sessionSaleIds.has((p as any).sale_id) && (p as any).payment_method === 'cash') {
      cashInFromSales += (p as any).amount_cents + ((p as any).tip_cents ?? 0)
    }
  }

  const expectedCash = (session as any).opening_cash_cents + cashInFromSales
  const variance = closingCashCents - expectedCash

  // Compute session totals from all session sales
  let totalRevenue = 0
  let totalTips = 0
  let totalSales = 0
  for (const p of sessionPayments ?? []) {
    if (sessionSaleIds.has((p as any).sale_id)) {
      totalRevenue += (p as any).amount_cents
      totalTips += (p as any).tip_cents ?? 0
      totalSales++
    }
  }

  const { error } = await supabase
    .from('register_sessions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: user.id,
      closing_cash_cents: closingCashCents,
      expected_cash_cents: expectedCash,
      cash_variance_cents: variance,
      total_sales_count: totalSales,
      total_revenue_cents: totalRevenue,
      total_tips_cents: totalTips,
      close_notes: closeNotes ?? null,
    } as any)
    .eq('id', sessionId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to close register: ${error.message}`)

  revalidatePath('/commerce')
  return { expectedCash, closingCashCents, variance, totalSales, totalRevenue }
}

// ─── Get Current Session ─────────────────────────────────────────

export async function getCurrentRegisterSession() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('register_sessions')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['open', 'suspended'])
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()

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
  const supabase = createServerClient()

  let query = supabase
    .from('register_sessions')
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenantId!)
    .order('opened_at', { ascending: false })

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
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('register_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) throw new Error(`Register session not found: ${error.message}`)
  return data
}
