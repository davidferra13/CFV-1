// Event 30-Day Reminder Email
// Sent to client 30 days before their event — softer "looking forward" tone

import { Text, Button } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type EventReminder30dProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  guestCount: number | null
  location: string | null
  eventId: string
  appUrl: string
  brand?: ChefBrandProps
}

export function EventReminder30dEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  guestCount,
  location,
  eventId,
  appUrl,
  brand,
}: EventReminder30dProps) {
  return (
    <BaseLayout brand={brand} preview={`Looking forward to your ${occasion} next month`}>
      <Text style={heading}>Looking forward to your event next month!</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Just a friendly heads-up — your <strong>{occasion}</strong> with <strong>{chefName}</strong>{' '}
        is about a month away. Here are the key details so far:
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
        No action needed right now — we just wanted to make sure this is on your radar. If anything
        has changed (guest count, location, dietary needs), you can update your details anytime
        through the portal.
      </Text>

      <Button href={`${appUrl}/my-events/${eventId}`} style={ctaButton}>
        Review Event Details →
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
