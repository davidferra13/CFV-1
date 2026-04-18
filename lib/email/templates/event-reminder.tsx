// Event Reminder Email
// Sent to client 24 hours before their event

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type EventReminderProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  serveTime: string | null
  arrivalTime: string | null
  location: string | null
  guestCount: number | null
  specialRequests: string | null
  coHostNames?: string[]
}

export function EventReminderEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  serveTime,
  arrivalTime,
  location,
  guestCount,
  specialRequests,
  coHostNames,
}: EventReminderProps) {
  return (
    <BaseLayout preview={`Reminder: ${occasion} tomorrow`}>
      <Text style={heading}>Your event is tomorrow!</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Just a friendly reminder that <strong>{chefName}</strong> will be with you tomorrow for your{' '}
        <strong>{occasion}</strong>. Here are the details:
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
          {coHostNames && coHostNames.length > 0 && (
            <tr>
              <td style={detailLabel}>Co-hosted with</td>
              <td style={detailValue}>{coHostNames.join(', ')}</td>
            </tr>
          )}
        </tbody>
      </table>
      <Text style={muted}>
        If anything changes, please let your chef know through ChefFlow as soon as possible.
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

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
