import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { generatePrepTimelineICal } from '@/lib/prep-timeline/ical-export'

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (user.role !== 'chef') {
    return NextResponse.json({ error: 'Chef access required' }, { status: 403 })
  }

  const eventId = req.nextUrl.searchParams.get('eventId')
  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  try {
    const ical = await generatePrepTimelineICal(eventId)
    return new NextResponse(ical, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="prep-timeline-${sanitizeFilenamePart(
          eventId
        )}.ics"`,
      },
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate' },
      { status: 500 }
    )
  }
}
