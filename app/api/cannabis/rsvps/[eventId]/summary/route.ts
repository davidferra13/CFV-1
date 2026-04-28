import { NextResponse } from 'next/server'
import { getCannabisRSVPDashboardData } from '@/lib/chef/cannabis-actions'

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatLabel(value: string | null | undefined) {
  if (!value) return 'Not provided'
  return value.replace(/_/g, ' ')
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildGuestRows(
  guests: Awaited<ReturnType<typeof getCannabisRSVPDashboardData>>['guests']
) {
  if (guests.length === 0) {
    return '<tr><td colspan="8">No invited guests found for this event.</td></tr>'
  }

  return guests
    .map(
      (guest) => `
        <tr>
          <td>${escapeHtml(guest.fullName)}</td>
          <td>${escapeHtml(formatLabel(guest.attendingStatus))}</td>
          <td>${escapeHtml(formatLabel(guest.cannabisParticipation))}</td>
          <td>${escapeHtml(formatLabel(guest.familiarityLevel))}</td>
          <td>${escapeHtml(formatLabel(guest.edibleFamiliarity))}</td>
          <td>${escapeHtml(guest.dietaryNotes || 'None noted')}</td>
          <td>${escapeHtml(guest.accessibilityNotes || 'None noted')}</td>
          <td>${guest.discussInPerson ? 'Yes' : 'No'}</td>
        </tr>
      `
    )
    .join('')
}

function buildControlPacketHtml(data: Awaited<ReturnType<typeof getCannabisRSVPDashboardData>>) {
  const event = data.selectedEvent
  const summary = data.summary
  const title = event?.occasion || 'Cannabis RSVP Control Packet'

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - RSVP Control Packet</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Arial, sans-serif;
      color: #172017;
      background: #f7faf6;
    }
    body {
      margin: 0;
      padding: 32px;
      background: #f7faf6;
    }
    main {
      max-width: 1100px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #dbe7d8;
      border-radius: 10px;
      padding: 28px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 24px;
    }
    h2 {
      margin: 28px 0 10px;
      font-size: 16px;
    }
    .muted {
      color: #647064;
      font-size: 13px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 10px;
      margin-top: 20px;
    }
    .stat {
      border: 1px solid #dbe7d8;
      border-radius: 8px;
      padding: 12px;
      background: #fbfdf9;
    }
    .stat strong {
      display: block;
      font-size: 22px;
    }
    .stat span {
      color: #647064;
      font-size: 11px;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #dbe7d8;
      padding: 8px;
      vertical-align: top;
      text-align: left;
    }
    th {
      background: #eef6ed;
      font-size: 11px;
      text-transform: uppercase;
      color: #435243;
    }
    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      main {
        border: 0;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <main>
    <p class="muted">ChefFlow cannabis RSVP control packet</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="muted">${escapeHtml(formatDate(event?.event_date))}${event?.serve_time ? ` at ${escapeHtml(event.serve_time)}` : ''}</p>

    <section class="grid" aria-label="RSVP summary">
      <div class="stat"><strong>${summary?.totalInvited ?? 0}</strong><span>Total invited</span></div>
      <div class="stat"><strong>${summary?.totalAttending ?? 0}</strong><span>Attending</span></div>
      <div class="stat"><strong>${summary?.participating ?? 0}</strong><span>Participating</span></div>
      <div class="stat"><strong>${summary?.notConsuming ?? 0}</strong><span>Not consuming</span></div>
      <div class="stat"><strong>${summary?.undecided ?? 0}</strong><span>Undecided</span></div>
      <div class="stat"><strong>${summary?.missingResponses ?? 0}</strong><span>Missing</span></div>
    </section>

    <h2>Guest Intake</h2>
    <table>
      <thead>
        <tr>
          <th>Guest</th>
          <th>Attending</th>
          <th>Participation</th>
          <th>Familiarity</th>
          <th>Edible familiarity</th>
          <th>Dietary</th>
          <th>Accessibility</th>
          <th>Discuss</th>
        </tr>
      </thead>
      <tbody>
        ${buildGuestRows(data.guests)}
      </tbody>
    </table>
  </main>
</body>
</html>`
}

export async function GET(_: Request, { params }: { params: { eventId: string } }) {
  try {
    const eventId = params.eventId
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)
    ) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
    }

    const data = await getCannabisRSVPDashboardData(eventId)
    if (!data.selectedEvent || data.selectedEvent.id !== eventId) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 })
    }

    return new NextResponse(buildControlPacketHtml(data), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate control packet'
    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('[cannabis-rsvp-summary] Control packet generation failed:', error)
    return NextResponse.json({ error: 'Failed to generate control packet' }, { status: 500 })
  }
}
