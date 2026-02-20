// Event 2-Day Reminder Email
// Sent to client 2 days before their event

import { Text, Button } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type EventReminder2dProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  serveTime: string | null
  arrivalTime: string | null
  location: string | null
  guestCount: number | null
  specialRequests: string | null
  eventId: string
  appUrl: string
}

export function EventReminder2dEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  serveTime,
  arrivalTime,
  location,
  guestCount,
  specialRequests,
  eventId,
  appUrl,
}: EventReminder2dProps) {
  return (
    <BaseLayout preview={`Reminder: ${occasion} is in 2 days`}>
      <Text style={heading}>Just 2 days to go!</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        A quick reminder that <strong>{chefName}</strong> will be arriving in{' '}
        <strong>2 days</strong> for your <strong>{occasion}</strong>.
        Here are the final details:
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Date</td>
            <td style={detailValue}>{eventDate}</td>
          </tr>
          {serveTime && (
            <tr>
              <td style={detailLabel}>Serve time</td>
              <td style={detailValue}>{serveTime}</td>
            </tr>
          )}
          {arrivalTime && (
            <tr>
              <td style={detailLabel}>Chef arrives</td>
              <td style={detailValue}>{arrivalTime}</td>
            </tr>
          )}
          {guestCount && (
            <tr>
              <td style={detailLabel}>Guests</td>
              <td style={detailValue}>{guestCount}</td>
            </tr>
          )}
          {location && (
            <tr>
              <td style={detailLabel}>Location</td>
              <td style={detailValue}>{location}</td>
            </tr>
          )}
          {specialRequests && (
            <tr>
              <td style={detailLabel}>Notes</td>
              <td style={detailValue}>{specialRequests}</td>
            </tr>
          )}
        </tbody>
      </table>

      <Text style={paragraph}>
        You can also add this event to your calendar directly from your portal.
      </Text>

      <Button
        href={`${appUrl}/my-events/${eventId}`}
        style={ctaButton}
      >
        View Event & Add to Calendar →
      </Button>

      <Text style={muted}>
        If anything changes, please contact {chefName} through ChefFlow as soon as possible.
      </Text>
    </BaseLayout>
  )
}

const heading = {
  fontSize: '24px',
  fontWeight: '600' as const,
  color: '#18181b',
  margin: '0 0 16px',
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
}

const detailsTable = {
  width: '100%',
  marginBottom: '24px',
  borderCollapse: 'collapse' as const,
}

const detailLabel = {
  fontSize: '13px',
  color: '#6b7280',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
  width: '120px',
}

const detailValue = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#18181b',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
}

const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#18181b',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  margin: '4px 0 20px',
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
