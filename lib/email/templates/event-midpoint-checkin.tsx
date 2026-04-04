// Event Midpoint Check-in Email
// Sent automatically at the midpoint between booking and event date.
// Purpose: reduce post-booking silence anxiety. Not a reminder, not marketing.
// Just: "everything is on track, here are your details, reply if anything changed."

import { Text, Button } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type EventMidpointCheckinProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  guestCount: number | null
  location: string | null
  eventId: string
  appUrl: string
}

export function EventMidpointCheckinEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  guestCount,
  location,
  eventId,
  appUrl,
}: EventMidpointCheckinProps) {
  const firstName = clientName?.split(' ')[0] || clientName

  return (
    <BaseLayout preview={`Your ${occasion} on ${eventDate} is confirmed and on track`}>
      <Text style={heading}>Everything is on track</Text>
      <Text style={paragraph}>Hi {firstName},</Text>
      <Text style={paragraph}>
        Your <strong>{occasion}</strong> with <strong>{chefName}</strong> on{' '}
        <strong>{eventDate}</strong> is confirmed. {chefName} is planning your menu and preparing
        for a great experience.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Date</td>
            <td style={detailValue}>{eventDate}</td>
          </tr>
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
        </tbody>
      </table>

      <Text style={paragraph}>
        If anything has changed (dietary needs, guest count, timing), just reply to this email or
        update your event details below.
      </Text>

      <Button href={`${appUrl}/my-events/${eventId}`} style={ctaButton}>
        View Event Details
      </Button>

      <Text style={muted}>
        No action needed if everything looks good. {chefName} will be in touch closer to the date.
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
