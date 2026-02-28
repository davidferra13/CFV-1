import { createAdminClient } from '@/lib/supabase/admin'
import { extractBearerToken, validateDeviceToken } from '@/lib/devices/token'
import { hasProAccess } from '@/lib/billing/tier'

type DeviceAuthContext = {
  supabase: any
  device: NonNullable<Awaited<ReturnType<typeof validateDeviceToken>>>
}

export class KioskApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function authenticateOrderKioskRequest(request: Request): Promise<DeviceAuthContext> {
  const token = extractBearerToken(request)
  if (!token) {
    throw new KioskApiError('Device token required', 401)
  }

  const device = await validateDeviceToken(token)
  if (!device) {
    throw new KioskApiError('Invalid or inactive device', 401)
  }

  if (device.kioskFlow !== 'order') {
    throw new KioskApiError('This device is not configured for order mode', 403)
  }

  const proAccess = await hasProAccess(device.tenantId)
  if (!proAccess) {
    throw new KioskApiError('Commerce requires Pro access', 402)
  }

  return {
    supabase: createAdminClient(),
    device,
  }
}

export async function assertStaffSession(input: {
  supabase: any
  deviceId: string
  requireStaffPin: boolean
  sessionId?: string
}) {
  if (!input.requireStaffPin) {
    return null
  }

  if (!input.sessionId) {
    throw new KioskApiError('Active staff session is required', 401)
  }

  const { data: session, error } = await (input.supabase
    .from('device_sessions' as any)
    .select('id, staff_member_id, status')
    .eq('id', input.sessionId)
    .eq('device_id', input.deviceId)
    .eq('status', 'active')
    .single() as any)

  if (error || !session) {
    throw new KioskApiError('Staff session not found or expired', 401)
  }

  return session
}

export async function getOpenRegisterSession(input: { supabase: any; tenantId: string }) {
  const { data: session } = await (input.supabase
    .from('register_sessions' as any)
    .select('id, status, opening_cash_cents')
    .eq('tenant_id', input.tenantId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle() as any)

  if (!session) {
    throw new KioskApiError('No open register session. Open a register first.', 409)
  }

  return session
}

export async function getDrawerSummary(input: {
  supabase: any
  tenantId: string
  registerSessionId: string
}) {
  const { data: movements } = await (input.supabase
    .from('cash_drawer_movements' as any)
    .select('movement_type, amount_cents')
    .eq('tenant_id', input.tenantId)
    .eq('register_session_id', input.registerSessionId) as any)

  const rows = movements ?? []
  const movementNetCents = rows.reduce((sum: number, row: any) => sum + (row.amount_cents ?? 0), 0)

  const breakdown = {
    salePaymentCents: 0,
    refundCents: 0,
    paidInCents: 0,
    paidOutCents: 0,
    adjustmentCents: 0,
  }

  for (const row of rows as any[]) {
    const amount = row.amount_cents ?? 0
    if (row.movement_type === 'sale_payment') breakdown.salePaymentCents += amount
    if (row.movement_type === 'refund') breakdown.refundCents += amount
    if (row.movement_type === 'paid_in') breakdown.paidInCents += amount
    if (row.movement_type === 'paid_out') breakdown.paidOutCents += amount
    if (row.movement_type === 'adjustment') breakdown.adjustmentCents += amount
  }

  const { data: session } = await (input.supabase
    .from('register_sessions' as any)
    .select('opening_cash_cents, status')
    .eq('id', input.registerSessionId)
    .eq('tenant_id', input.tenantId)
    .single() as any)

  return {
    openingCashCents: (session as any)?.opening_cash_cents ?? 0,
    movementNetCents,
    expectedCashCents: ((session as any)?.opening_cash_cents ?? 0) + movementNetCents,
    status: (session as any)?.status ?? 'open',
    breakdown,
  }
}
