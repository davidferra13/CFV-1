import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authenticateOrderKioskRequest,
  assertStaffSession,
  getDrawerSummary,
  getOpenRegisterSession,
  KioskApiError,
} from '../_helpers'

const DrawerMutationSchema = z.object({
  action: z.enum(['paid_in', 'paid_out', 'adjustment']),
  amount_cents: z.number().int(),
  notes: z.string().max(500).optional().or(z.literal('')),
  session_id: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  try {
    const { supabase, device } = await authenticateOrderKioskRequest(request)

    const url = new URL(request.url)
    const sessionId = url.searchParams.get('session_id') || undefined
    await assertStaffSession({
      supabase,
      deviceId: device.deviceId,
      requireStaffPin: device.requireStaffPin,
      sessionId,
    })

    const registerSession = await getOpenRegisterSession({
      supabase,
      tenantId: device.tenantId,
    })

    const [summary, movementResult] = await Promise.all([
      getDrawerSummary({
        supabase,
        tenantId: device.tenantId,
        registerSessionId: registerSession.id,
      }),
      supabase
        .from('cash_drawer_movements')
        .select('*')
        .eq('tenant_id', device.tenantId)
        .eq('register_session_id', registerSession.id)
        .order('created_at', { ascending: false })
        .limit(60),
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
    const { supabase, device } = await authenticateOrderKioskRequest(request)

    const body = await request.json()
    const parsed = DrawerMutationSchema.parse(body)

    const session = await assertStaffSession({
      supabase,
      deviceId: device.deviceId,
      requireStaffPin: device.requireStaffPin,
      sessionId: parsed.session_id,
    })

    const registerSession = await getOpenRegisterSession({
      supabase,
      tenantId: device.tenantId,
    })

    const rawAmount = parsed.amount_cents
    if (!Number.isInteger(rawAmount) || rawAmount === 0) {
      return NextResponse.json(
        { error: 'Amount must be a non-zero integer (cents)' },
        { status: 400 }
      )
    }

    if ((parsed.action === 'paid_in' || parsed.action === 'paid_out') && rawAmount < 0) {
      return NextResponse.json({ error: 'Use a positive amount for paid in/out' }, { status: 400 })
    }

    const amountCents =
      parsed.action === 'paid_out'
        ? -1 * Math.abs(rawAmount)
        : parsed.action === 'paid_in'
          ? Math.abs(rawAmount)
          : rawAmount

    const { error } = await supabase.from('cash_drawer_movements').insert({
      tenant_id: device.tenantId,
      register_session_id: registerSession.id,
      movement_type: parsed.action,
      amount_cents: amountCents,
      notes: parsed.notes?.trim() || null,
      metadata: {
        source: 'kiosk',
        device_id: device.deviceId,
        device_session_id: parsed.session_id || null,
        staff_member_id: (session as any)?.staff_member_id ?? null,
      },
      created_by: null,
    } as any)

    if (error) {
      return NextResponse.json(
        { error: `Failed to record movement: ${error.message}` },
        { status: 500 }
      )
    }

    try {
      await supabase.from('device_events').insert({
        device_id: device.deviceId,
        tenant_id: device.tenantId,
        staff_member_id: (session as any)?.staff_member_id ?? null,
        type: 'cash_drawer_movement',
        payload: {
          register_session_id: registerSession.id,
          action: parsed.action,
          amount_cents: amountCents,
        },
      })
    } catch (eventError) {
      console.error('[kiosk/order/drawer] Device event log failed (non-blocking):', eventError)
    }

    const summary = await getDrawerSummary({
      supabase,
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
        { error: err.errors[0]?.message || 'Validation error' },
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
