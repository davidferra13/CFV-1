// Morning Briefing Email Template
// Server-rendered React email for the daily morning briefing.

import { Fragment, type ReactElement } from 'react'

type BriefingEvent = {
  title: string
  time: string | null
  client_name: string | null
  guest_count: number | null
}

type ActionItem = {
  label: string
  count: number
}

type MorningBriefingEmailProps = {
  greeting: string
  dateDisplay: string
  events: BriefingEvent[]
  actionItems: ActionItem[]
  weekEventCount: number
  briefingUrl: string
}

function formatTime(time: string | null): string {
  if (!time) return 'TBD'
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

export function MorningBriefingEmail({
  greeting,
  dateDisplay,
  events,
  actionItems,
  weekEventCount,
  briefingUrl,
}: MorningBriefingEmailProps): ReactElement {
  return (
    <div
      style={{
        maxWidth: '560px',
        margin: '0 auto',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        backgroundColor: '#1c1917',
        color: '#e7e5e4',
        padding: '24px',
        borderRadius: '12px',
      }}
    >
      <h1 style={{ fontSize: '20px', margin: '0 0 4px', color: '#fafaf9' }}>{greeting}</h1>
      <p style={{ fontSize: '13px', color: '#a8a29e', margin: '0 0 20px' }}>{dateDisplay}</p>

      {/* Today's Events */}
      <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#e7e5e4', fontSize: '14px' }}>
        {events.length > 0 ? `TODAY'S EVENTS (${events.length})` : 'No events scheduled for today.'}
      </p>

      {events.map((event, idx) => (
        <p
          key={idx}
          style={{
            margin: 0,
            padding: '0 0 0 16px',
            color: '#d4d4d4',
            fontSize: '14px',
          }}
        >
          {formatTime(event.time)} - {event.title}
          {event.client_name ? ` (${event.client_name})` : ''}
          {event.guest_count ? ` - ${event.guest_count} guests` : ''}
        </p>
      ))}

      <br />

      {/* Action Items */}
      {actionItems.length > 0 && (
        <Fragment>
          <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#e7e5e4', fontSize: '14px' }}>
            ACTION NEEDED
          </p>
          {actionItems.map((item, idx) => (
            <p
              key={idx}
              style={{
                margin: 0,
                padding: '0 0 0 16px',
                color: '#d4d4d4',
                fontSize: '14px',
              }}
            >
              - {item.count} {item.label}
            </p>
          ))}
          <br />
        </Fragment>
      )}

      {/* Week Ahead */}
      {weekEventCount > 0 && (
        <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#e7e5e4', fontSize: '14px' }}>
          THIS WEEK: {weekEventCount} event{weekEventCount !== 1 ? 's' : ''} ahead
        </p>
      )}

      {/* CTA */}
      <div
        style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #44403c',
        }}
      >
        <a
          href={briefingUrl}
          style={{
            color: '#e88f47',
            fontSize: '14px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          View Full Briefing in ChefFlow
        </a>
      </div>
    </div>
  )
}
