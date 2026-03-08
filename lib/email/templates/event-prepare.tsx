// Event Prepare Email
// Sent to client 7 days before their event — prep tips and key details

import { Text, Button } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type EventPrepareProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  serveTime: string | null
  arrivalTime: string | null
  location: string | null
  guestCount: number | null
  eventId: string
  appUrl: string
  brand?: ChefBrandProps
}

export function EventPrepareEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  serveTime,
  arrivalTime,
  location,
  guestCount,
  eventId,
  appUrl,
  brand,
}: EventPrepareProps) {
  return (
    <BaseLayout brand={brand} preview={`${chefName} is coming in 7 days — here's how to prepare`}>
      <Text style={heading}>Your event is one week away!</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        <strong>{chefName}</strong> will be with you in just 7 days for your{' '}
        <strong>{occasion}</strong>. Here are the confirmed details:
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
        </tbody>
      </table>

      <Text style={subheading}>A few things to take care of this week:</Text>
      <Text style={checklistItem}>
        ✓ Confirm your final guest count (let the chef know of any changes)
      </Text>
      <Text style={checklistItem}>✓ Remind guests of any dietary restrictions or allergies</Text>
      <Text style={checklistItem}>✓ Ensure parking or entry access is ready for the chef</Text>
      <Text style={checklistItem}>✓ Clear counter and prep space in the kitchen</Text>
      <Text style={checklistItem}>✓ Have any questions? Message the chef now via the portal</Text>

      <Button href={`${appUrl}/my-events/${eventId}`} style={ctaButton}>
        View Event Details →
      </Button>

      <Text style={muted}>
        If anything changes before the event, please let {chefName} know through ChefFlow as soon as
        possible.
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

const subheading = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#18181b',
  margin: '24px 0 8px',
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
}

const checklistItem = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 6px',
  paddingLeft: '4px',
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
  margin: '20px 0',
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '16px 0 0',
}
