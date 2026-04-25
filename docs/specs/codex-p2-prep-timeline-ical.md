# Codex Build Spec: P2 Prep Timeline iCal Export

> Priority: P2. New feature. Allows chefs to get prep reminders via their existing calendar app.
> Risk: MEDIUM. New server action + new UI button. No migrations, no new tables.

---

## The Problem

The prep timeline (`lib/prep-timeline/compute-timeline.ts`) computes which items to prep on which day, but there are no reminders. A chef has to manually check the app to see what's due. The simplest fix: let them export prep days as iCal events they can import into Google Calendar / Apple Calendar.

## The Implementation

### File 1: New server action `lib/prep-timeline/ical-export.ts`

Create this new file:

```ts
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getEventPrepTimeline } from './actions'

/**
 * Generate an iCal (.ics) string for an event's prep timeline.
 * Each prep day becomes an all-day calendar event with item list in description.
 */
export async function generatePrepTimelineICal(eventId: string): Promise<string> {
  await requireChef()
  const timeline = await getEventPrepTimeline(eventId)

  if (!timeline || !timeline.days.length) {
    throw new Error('No prep timeline data for this event')
  }

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChefFlow//PrepTimeline//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const day of timeline.days) {
    // Format date as YYYYMMDD for all-day event
    const dateStr = day.date.replace(/-/g, '')
    // Next day for DTEND (iCal all-day events use exclusive end)
    const endDate = new Date(day.date)
    endDate.setDate(endDate.getDate() + 1)
    const endStr = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, '0')}${String(endDate.getDate()).padStart(2, '0')}`

    // Build description from items
    const itemLines = (day.items || []).map((item: any) => {
      const name = item.name || item.componentName || 'Item'
      const time = item.activeMinutes ? ` (${item.activeMinutes}min active)` : ''
      return `- ${name}${time}`
    })
    const description = itemLines.join('\\n')

    const uid = `prep-${eventId}-${dateStr}@chefflow`

    lines.push('BEGIN:VEVENT')
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`)
    lines.push(`DTEND;VALUE=DATE:${endStr}`)
    lines.push(`SUMMARY:Prep Day - ${day.label || day.date}`)
    lines.push(`DESCRIPTION:${description}`)
    lines.push(`UID:${uid}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
```

### File 2: API route `app/api/prep-timeline/ical/route.ts`

Create this new file:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { generatePrepTimelineICal } from '@/lib/prep-timeline/ical-export'

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
        'Content-Disposition': `attachment; filename="prep-timeline-${eventId}.ics"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate' }, { status: 500 })
  }
}
```

### File 3: Add export button to the prep timeline UI

Find the prep timeline component that renders for an event. It is likely in `app/(chef)/events/[id]/_components/` or a component imported there. Look for where `PrepDay` cards or prep timeline data is rendered.

Add a simple download link/button near the top of the prep timeline section:

```tsx
<a
  href={`/api/prep-timeline/ical?eventId=${eventId}`}
  download
  className="inline-flex items-center gap-2 rounded-lg border border-stone-600 bg-stone-800 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700"
>
  Export to Calendar
</a>
```

**If you cannot find the prep timeline UI component, SKIP adding the button. The server action and API route are still useful on their own.**

## What NOT to change

- DO NOT modify `lib/prep-timeline/compute-timeline.ts`
- DO NOT modify `lib/prep-timeline/actions.ts`
- DO NOT add any npm packages (iCal format is simple enough to generate manually)
- DO NOT create database tables or migrations

## Verification

- Run `npx tsc --noEmit --skipLibCheck`
- The API route should return a valid .ics file when called with a real eventId
- The .ics file should contain one VEVENT per prep day
