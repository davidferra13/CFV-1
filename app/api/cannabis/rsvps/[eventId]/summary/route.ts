import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getCannabisRSVPDashboardData } from '@/lib/chef/cannabis-actions'
import { PDFLayout } from '@/lib/documents/pdf-layout'

export async function GET(_request: Request, { params }: { params: { eventId: string } }) {
  try {
    await requireChef()

    const dashboard = await getCannabisRSVPDashboardData(params.eventId)
    if (!dashboard.selectedEvent || !dashboard.summary) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const pdf = new PDFLayout()
    const title = dashboard.selectedEvent.occasion || 'Cannabis Event'

    pdf.title('CANNABIS RSVP SUMMARY')
    pdf.headerBar([
      ['Event', title],
      ['Date', dashboard.selectedEvent.event_date],
      ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
    ])
    pdf.space(2)

    pdf.sectionHeader('ATTENDANCE SNAPSHOT')
    pdf.keyValue('Total invited', String(dashboard.summary.totalInvited))
    pdf.keyValue('Attending', String(dashboard.summary.totalAttending))
    pdf.keyValue('Participating', String(dashboard.summary.participating))
    pdf.keyValue('Not consuming', String(dashboard.summary.notConsuming))
    pdf.keyValue('Undecided', String(dashboard.summary.undecided))
    pdf.keyValue('Missing responses', String(dashboard.summary.missingResponses))
    pdf.space(2)

    const followUp = dashboard.guests.filter(
      (guest) => guest.cannabisParticipation === 'no_response' || guest.discussInPerson
    )
    pdf.sectionHeader('FOLLOW-UP PRIORITY')
    if (followUp.length === 0) {
      pdf.text('No follow-up flags currently open.')
    } else {
      followUp.slice(0, 20).forEach((guest) => {
        const flags: string[] = []
        if (guest.cannabisParticipation === 'no_response') flags.push('No response')
        if (guest.discussInPerson) flags.push('Discuss in person')
        if (guest.accessibilityNotes) flags.push('Accessibility note')
        if (guest.dietaryNotes) flags.push('Dietary note')

        pdf.bullet(`${guest.fullName} - ${flags.join(', ')}`)
      })
      if (followUp.length > 20) {
        pdf.text(`+ ${followUp.length - 20} additional guests`)
      }
    }

    pdf.space(2)
    pdf.sectionHeader('GUEST INTAKE DETAIL')
    dashboard.guests.slice(0, 24).forEach((guest) => {
      const row = `${guest.fullName} | ${guest.attendingStatus} | ${guest.cannabisParticipation} | familiarity: ${guest.familiarityLevel || '-'}`
      pdf.text(row, 8)
    })
    if (dashboard.guests.length > 24) {
      pdf.text(`+ ${dashboard.guests.length - 24} more guests`, 8, 'italic')
    }

    pdf.footer('ChefFlow Cannabis RSVP Dashboard')

    const bytes = new Uint8Array(pdf.toBuffer())
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="cannabis-rsvp-summary-${dateSuffix}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export RSVP summary'
    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[rsvp-summary] Error:', error)
    return NextResponse.json({ error: 'Failed to export RSVP summary' }, { status: 500 })
  }
}
