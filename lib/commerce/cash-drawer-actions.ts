'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { appendPosAuditLog } from './pos-audit-log'
import { assertPosManagerAccess, assertPosRoleAccess, type PosAccessLevel } from './pos-authorization'

export type CashDrawerMovementType =
  | 'sale_payment'
  | 'refund'
  | 'paid_in'
  | 'paid_out'
  | 'adjustment'

export type CashDrawerSummary = {
  registerSessionId: string
  status: string
  openingCashCents: number
  movementNetCents: number
  expectedCashCents: number
  breakdown: {
    salePaymentCents: number
    refundCents: number
    paidInCents: number
    paidOutCents: number
    adjustmentCents: number
  }
}

type MovementRecord = {
  movement_type: CashDrawerMovementType
  amount_cents: number
}

async function assertOpenRegisterSession(tenantId: string, registerSessionId: string) {
  const supabase: any = createServerClient()
  const { data: session, error } = await (supabase
    .from('register_sessions' as any)
    .select('id, status')
    .eq('id', registerSessionId)
    .eq('tenant_id', tenantId)
    .single() as any)

  if (error || !session) {
    throw new Error('Register session not found')
  }

  if ((session as any).status !== 'open') {
    throw new Error('Cash movements can only be recorded on an open register session')
  }

  return session
}

function buildBreakdown(movements: MovementRecord[]) {
  const breakdown = {
    salePaymentCents: 0,
    refundCents: 0,
    paidInCents: 0,
    paidOutCents: 0,
    adjustmentCents: 0,
  }

  for (const movement of movements) {
    const amount = movement.amount_cents ?? 0
    if (movement.movement_type === 'sale_payment') breakdown.salePaymentCents += amount
    if (movement.movement_type === 'refund') breakdown.refundCents += amount
    if (movement.movement_type === 'paid_in') breakdown.paidInCents += amount
    if (movement.movement_type === 'paid_out') breakdown.paidOutCents += amount
    if (movement.movement_type === 'adjustment') breakdown.adjustmentCents += amount
  }

  return breakdown
}

export async function getCashDrawerSummary(registerSessionId: string): Promise<CashDrawerSummary> {
  const user = await requireChef()
  await requirePro('commerce')

  const supabase: any = createServerClient()

  const { data: session, error: sessionError } = await (supabase
    .from('register_sessions' as any)
    .select('id, status, opening_cash_cents')
    .eq('id', registerSessionId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (sessionError || !session) {
    throw new Error('Register session not found')
  }

  const { data: movements, error: movementError } = await (supabase
    .from('cash_drawer_movements' as any)
    .select('movement_type, amount_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('register_session_id', registerSessionId) as any)

  if (movementError) {
    throw new Error(`Failed to load cash drawer summary: ${movementError.message}`)
  }

  const rows = (movements ?? []) as MovementRecord[]
  const movementNetCents = rows.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0)
  const breakdown = buildBreakdown(rows)

  return {
    registerSessionId,
    status: (session as any).status,
    openingCashCents: (session as any).opening_cash_cents ?? 0,
    movementNetCents,
    expectedCashCents: ((session as any).opening_cash_cents ?? 0) + movementNetCents,
    breakdown,
  }
}

export async function listCashDrawerMovements(input: {
  registerSessionId: string
  limit?: number
  offset?: number
}) {
  const user = await requireChef()
  await requirePro('commerce')

  const supabase: any = createServerClient()
  const limit = Math.max(1, Math.min(input.limit ?? 50, 250))
  const offset = Math.max(0, input.offset ?? 0)

  const { data, error, count } = await (supabase
    .from('cash_drawer_movements' as any)
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenantId!)
    .eq('register_session_id', input.registerSessionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1) as any)

  if (error) throw new Error(`Failed to list drawer movements: ${error.message}`)

  return {
    movements: data ?? [],
    total: count ?? 0,
  }
}

async function insertMovement(input: {
  registerSessionId: string
  movementType: 'paid_in' | 'paid_out' | 'adjustment'
  amountCents: number
  notes?: string
  metadata?: Record<string, any>
  allowZeroAmount?: boolean
  requireManager?: boolean
  requiredLevel?: PosAccessLevel
}) {
  const user = await requireChef()
  await requirePro('commerce')

  if (
    !Number.isInteger(input.amountCents) ||
    (input.amountCents === 0 && !input.allowZeroAmount)
  ) {
    throw new Error('Amount must be a non-zero integer (cents)')
  }

  const supabase: any = createServerClient()
  await assertOpenRegisterSession(user.tenantId!, input.registerSessionId)

  if (input.requireManager) {
    await assertPosManagerAccess({
      supabase,
      user,
      action: `record ${input.movementType.replace('_', ' ')} drawer movement`,
    })
  }
  if (input.requiredLevel) {
    await assertPosRoleAccess({
      supabase,
      user,
      action: `record ${input.movementType.replace('_', ' ')} drawer movement`,
      requiredLevel: input.requiredLevel,
    })
  }

  const { data: inserted, error } = await (supabase
    .from('cash_drawer_movements' as any)
    .insert({
      tenant_id: user.tenantId!,
      register_session_id: input.registerSessionId,
      movement_type: input.movementType,
      amount_cents: input.amountCents,
      notes: input.notes ?? null,
      metadata: input.metadata ?? { source: 'manual' },
      created_by: user.id,
    } as any)
    .select('id')
    .single() as any)

  if (error || !inserted) throw new Error(`Failed to record cash movement: ${error?.message}`)

  await appendPosAuditLog({
    tenantId: user.tenantId!,
    action: 'cash_drawer_movement_recorded',
    tableName: 'cash_drawer_movements',
    recordId: inserted.id,
    changedBy: user.id,
    summary: `Drawer movement: ${input.movementType}`,
    afterValues: {
      register_session_id: input.registerSessionId,
      movement_type: input.movementType,
      amount_cents: input.amountCents,
      notes: input.notes ?? null,
      metadata: input.metadata ?? { source: 'manual' },
    },
  })

  revalidatePath('/commerce')
  revalidatePath('/commerce/register')

  return getCashDrawerSummary(input.registerSessionId)
}

export async function recordCashPaidIn(input: {
  registerSessionId: string
  amountCents: number
  notes?: string
}) {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Paid in amount must be a positive integer (cents)')
  }

  return insertMovement({
    registerSessionId: input.registerSessionId,
    movementType: 'paid_in',
    amountCents: input.amountCents,
    notes: input.notes,
    requiredLevel: 'lead',
  })
}

export async function recordCashPaidOut(input: {
  registerSessionId: string
  amountCents: number
  notes?: string
}) {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Paid out amount must be a positive integer (cents)')
  }

  return insertMovement({
    registerSessionId: input.registerSessionId,
    movementType: 'paid_out',
    amountCents: -1 * input.amountCents,
    notes: input.notes,
    requireManager: true,
  })
}

export async function recordCashAdjustment(input: {
  registerSessionId: string
  amountCents: number
  notes?: string
}) {
  return insertMovement({
    registerSessionId: input.registerSessionId,
    movementType: 'adjustment',
    amountCents: input.amountCents,
    notes: input.notes,
    requireManager: true,
  })
}

export async function recordCashNoSaleOpen(input: {
  registerSessionId: string
  notes: string
}) {
  const normalizedNotes = input.notes.trim()
  if (!normalizedNotes) {
    throw new Error('Notes are required for a no-sale drawer open')
  }

  return insertMovement({
    registerSessionId: input.registerSessionId,
    movementType: 'adjustment',
    amountCents: 0,
    notes: normalizedNotes,
    allowZeroAmount: true,
    requireManager: true,
    metadata: {
      source: 'no_sale',
    },
  })
}
