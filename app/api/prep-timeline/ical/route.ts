import { NextRequest, NextResponse } from 'next/server'
import { generatePrepTimelineICal } from '@/lib/prep-timeline/ical-export'

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export async function GET(req: NextRequest) {
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
