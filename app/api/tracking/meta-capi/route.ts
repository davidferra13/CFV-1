import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { sendConversionEvent, type CAPIEvent } from '@/lib/tracking/meta-capi'

export async function POST(request: NextRequest) {
  // This server-side conversion relay has no public browser callers.
  // Restrict privileged Meta event submission to platform administrators.
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()

    const event: CAPIEvent = {
      event_name: body.event_name,
      event_time: body.event_time,
      event_id: body.event_id,
      event_source_url: body.event_source_url,
      user_data: {
        email: body.user_data?.email,
        ip:
          body.user_data?.ip ??
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          request.headers.get('x-real-ip') ??
          undefined,
        userAgent: body.user_data?.user_agent ?? request.headers.get('user-agent') ?? undefined,
        fbc: body.user_data?.fbc,
        fbp: body.user_data?.fbp,
      },
      custom_data: body.custom_data,
    }

    const result = await sendConversionEvent(event)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }
}
