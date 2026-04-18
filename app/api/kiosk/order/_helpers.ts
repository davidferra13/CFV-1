import { createAdminClient } from '@/lib/db/admin'
import { extractBearerToken, validateDeviceToken } from '@/lib/devices/token'
import { computeRegisterSessionTotals } from '@/lib/commerce/register-metrics'
import { isPosManagerRole, readPosManagerRoleSetFromEnv } from '@/lib/commerce/kiosk-policy'

type DeviceAuthContext = {
  db: any
  device: NonNullable<Awaited<ReturnType<typeof validateDeviceToken>>>
}

export type KioskStaffSession = {
  id: string
  staff_member_id: string
  staff_role: string | null
  staff_name: string | null
  status: string
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

  // All features are free - no tier check needed

  return {
    db: createAdminClient(),
    device,
  }
}

export async function assertStaffSession(input: {
  db: any
  deviceId: string
  tenantId: string
  requireStaffPin: boolean
  sessionId?: string
}): Promise<KioskStaffSession | null> {
  if (!input.requireStaffPin) {
    return null
  }

  if (!input.sessionId) {
    throw new KioskApiError('Active staff session is required', 401)
  }

  const { data: session, error } = await (input.db
    .from('device_sessions' as any)
    .select('id, staff_member_id, status')
    .eq('id', input.sessionId)
    .eq('device_id', input.deviceId)
    .eq('status', 'active')
    .single() as any)

  if (error || !session) {
    throw new KioskApiError('Staff session not found or expired', 401)
  }

  const { data: staffMember, error: staffMemberError } = await (input.db
    .from('staff_members' as any)
    .select('id, role, name, status')
    .eq('id', (session as any).staff_member_id)
    .eq('chef_id', input.tenantId)
    .maybeSingle() as any)

  if (staffMemberError || !staffMember) {
    throw new KioskApiError('Staff member not found for active session', 401)
  }

  if ((staffMember as any).status !== 'active') {
    throw new KioskApiError('Staff member is not active', 401)
  }

  return {
    id: (session as any).id,
    staff_member_id: (session as any).staff_member_id,
    staff_role: (staffMember as any).role ?? null,
    staff_name: (staffMember as any).name ?? null,
    status: (session as any).status ?? 'active',
  }
}

export function assertManagerDrawerPermission(input: {
  staffSession: KioskStaffSession | null
  action: 'paid_in' | 'paid_out' | 'adjustment' | 'no_sale'
}) {
  if (input.action === 'paid_in') {
    return
  }

  if (!input.staffSession) {
    throw new KioskApiError('Active manager session is required', 401)
  }

  const managerRoles = readPosManagerRoleSetFromEnv()
  const isManager = isPosManagerRole({
    role: input.staffSession.staff_role,
    managerRoles,
  })

  if (!isManager) {
    throw new KioskApiError('Manager role required for this drawer action', 403)
  }
}

export async function getOpenRegisterSession(input: { db: any; tenantId: string }) {
  const { data: session } = await (input.db
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
  db: any
  tenantId: string
  registerSessionId: string
}) {
  const { data: movements } = await (input.db
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

  const { data: session } = await (input.db
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

export async function syncRegisterSessionTotals(input: {
  db: any
  tenantId: string
  registerSessionId: string
}) {
  const { data: sales } = await (input.db
    .from('sales' as any)
    .select('id, status')
    .eq('tenant_id', input.tenantId)
    .eq('register_session_id', input.registerSessionId) as any)

  const saleIds = (sales ?? []).map((sale: any) => sale.id).filter(Boolean)

  let payments: any[] = []
  if (saleIds.length > 0) {
    const { data } = await (input.db
      .from('commerce_payments' as any)
      .select('sale_id, amount_cents, tip_cents, status')
      .eq('tenant_id', input.tenantId)
      .in('sale_id', saleIds) as any)
    payments = data ?? []
  }

  const totals = computeRegisterSessionTotals({
    sales: sales ?? [],
    payments,
  })

  await (input.db
    .from('register_sessions' as any)
    .update({
      total_sales_count: totals.totalSalesCount,
      total_revenue_cents: totals.totalRevenueCents,
      total_tips_cents: totals.totalTipsCents,
    } as any)
    .eq('id', input.registerSessionId)
    .eq('tenant_id', input.tenantId) as any)

  return totals
}
