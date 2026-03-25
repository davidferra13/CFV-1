import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authenticateOrderKioskRequest,
  assertManagerDrawerPermission,
  assertStaffSession,
  getDrawerSummary,
  getOpenRegisterSession,
  KioskApiError,
} from '../_helpers'

const DrawerMutationSchema = z.object({
  action: z.enum(['paid_in', 'paid_out', 'adjustment', 'no_sale']),
  amount_cents: z.number().int().optional(),
  notes: z.string().max(500).optional().or(z.literal('')),
  session_id: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  try {
    const { db, device } = await authenticateOrderKioskRequest(request)

    const url = new URL(request.url)
    const sessionId = url.searchParams.get('session_id') || undefined
    await assertStaffSession({
      db,
      deviceId: device.deviceId,
      tenantId: device.tenantId,
      requireStaffPin: device.requireStaffPin,
      sessionId,
    })

    const registerSession = await getOpenRegisterSession({
      db,
      tenantId: device.tenantId,
    })

    const [summary, movementResult] = await Promise.all([
      getDrawerSummary({
        db,
        tenantId: device.tenantId,
        registerSessionId: registerSession.id,
      }),
      db
        .from('cash_drawer_movements' as any)
        .select('*')
        .eq('tenant_id', device.tenantId)
        .eq('register_session_id', registerSession.id)
        .order('created_at', { ascending: false })
        .limit(60) as any,
    ])

    return NextResponse.json({
      register_session: registerSession,
      summary,
      movements: movementResult.data ?? [],
    })
  } catch (err) {
    if (err instanceof KioskApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }

    console.error('[kiosk/order/drawer] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db, device } = await authenticateOrderKioskRequest(request)

    const body = await request.json()
    const parsed = DrawerMutationSchema.parse(body)

    const session = await assertStaffSession({
      db,
      deviceId: device.deviceId,
      tenantId: device.tenantId,
      requireStaffPin: device.requireStaffPin,
      sessionId: parsed.session_id,
    })

    assertManagerDrawerPermission({
      staffSession: session,
      action: parsed.action,
    })

    const registerSession = await getOpenRegisterSession({
      db,
      tenantId: device.tenantId,
    })

    const normalizedNotes = parsed.notes?.trim() ?? ''
    let amountCents = 0

    if (parsed.action === 'no_sale') {
      if (!normalizedNotes) {
        return NextResponse.json(
          { error: 'Notes are required for no-sale drawer opens' },
          { status: 400 }
        )
      }
    } else {
      const rawAmount = parsed.amount_cents
      if (typeof rawAmount !== 'number' || !Number.isInteger(rawAmount) || rawAmount === 0) {
        return NextResponse.json(
          { error: 'Amount must be a non-zero integer (cents)' },
          { status: 400 }
        )
      }
      const normalizedAmount = rawAmount

      if ((parsed.action === 'paid_in' || parsed.action === 'paid_out') && normalizedAmount < 0) {
        return NextResponse.json(
          { error: 'Use a positive amount for paid in/out' },
          { status: 400 }
        )
      }

      amountCents =
        parsed.action === 'paid_out'
          ? -1 * Math.abs(normalizedAmount)
          : parsed.action === 'paid_in'
            ? Math.abs(normalizedAmount)
            : normalizedAmount
    }

    const { error } = await (db as any).from('cash_drawer_movements').insert({
      tenant_id: device.tenantId,
      register_session_id: registerSession.id,
      movement_type: parsed.action === 'no_sale' ? 'adjustment' : parsed.action,
      amount_cents: amountCents,
      notes: normalizedNotes || null,
      metadata: {
        source: 'kiosk',
        source_action: parsed.action,
        device_id: device.deviceId,
        device_session_id: parsed.session_id || null,
        staff_member_id: (session as any)?.staff_member_id ?? null,
      },
      created_by: null,
    } as any)

    if (error) {
      return NextResponse.json({ error: 'Failed to record movement' }, { status: 500 })
    }

    try {
      await (db as any).from('device_events').insert({
        device_id: device.deviceId,
        tenant_id: device.tenantId,
        staff_member_id: (session as any)?.staff_member_id ?? null,
        type: 'cash_drawer_movement',
        payload: {
          register_session_id: registerSession.id,
          action: parsed.action,
          amount_cents: amountCents,
          no_sale: parsed.action === 'no_sale',
        },
      })
    } catch (eventError) {
      console.error('[kiosk/order/drawer] Device event log failed (non-blocking):', eventError)
    }

    const summary = await getDrawerSummary({
      db,
      tenantId: device.tenantId,
      registerSessionId: registerSession.id,
    })

    return NextResponse.json({
      success: true,
      register_session_id: registerSession.id,
      summary,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: (err as any).errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    if (err instanceof KioskApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }

    console.error('[kiosk/order/drawer] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
