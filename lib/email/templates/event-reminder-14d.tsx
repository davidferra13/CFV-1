// Event 14-Day Reminder Email
// Sent to client 14 days before their event — "two weeks out" tone

import { Text, Button } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type EventReminder14dProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  serveTime: string | null
  guestCount: number | null
  location: string | null
  specialRequests: string | null
  eventId: string
  appUrl: string
  brand?: ChefBrandProps
}

export function EventReminder14dEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  serveTime,
  guestCount,
  location,
  specialRequests,
  eventId,
  appUrl,
  brand,
}: EventReminder14dProps) {
  return (
    <BaseLayout brand={brand} preview={`Your ${occasion} is coming up in two weeks`}>
      <Text style={heading}>Your event is coming up in two weeks!</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Your <strong>{occasion}</strong> with <strong>{chefName}</strong> is just{' '}
        <strong>two weeks away</strong>. Here are your current event details:
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
        Now is a great time to review everything and make any last adjustments — guest count,
        dietary needs, timing, or special requests. The sooner any changes are confirmed, the better{' '}
        {chefName} can prepare.
      </Text>

      <Button href={`${appUrl}/my-events/${eventId}`} style={ctaButton}>
        Review & Update Details →
      </Button>

      <Text style={muted}>
        If you have any questions, reach out to {chefName} through ChefFlow anytime.
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
