import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createFBEvent, updateFBEvent, getSyncRecord } from '@/lib/social/facebook-events'

export async function POST(req: NextRequest) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const { eventId, action } = (await req.json()) as {
    eventId: string
    action?: 'create' | 'update'
  }

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  if (action === 'update') {
    const sync = getSyncRecord(eventId, tenantId)
    if (!sync) {
      return NextResponse.json(
        { error: 'No existing FB Event sync found. Create first.' },
        { status: 404 }
      )
    }
    const result = await updateFBEvent(tenantId, eventId, sync.fbEventId)
    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  }

  const result = await createFBEvent(tenantId, eventId)
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
