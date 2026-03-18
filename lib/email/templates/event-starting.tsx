// Event Starting - Client Notification Email
// Sent to the client when the chef marks the event as in_progress ("chef is on the way").

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  arrivalTime: string | null
  serveTime: string | null
  location: string | null
}

export function EventStartingEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  arrivalTime,
  serveTime,
  location,
}: Props) {
  return (
    <BaseLayout preview={`${chefName} is on the way for your ${occasion}`}>
      <Text style={heading}>Your chef is on the way</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        <strong>{chefName}</strong> is confirmed and heading your way for your{' '}
        <strong>{occasion}</strong> today. Here's what to expect:
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Date</td>
            <td style={detailValue}>{eventDate}</td>
          </tr>
          {arrivalTime && (
            <tr>
              <td style={detailLabel}>Arrival time</td>
              <td style={detailValue}>{arrivalTime}</td>
            </tr>
          )}
          {serveTime && (
            <tr>
              <td style={detailLabel}>Serve time</td>
              <td style={detailValue}>{serveTime}</td>
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
        Make sure the kitchen is accessible and ready. We look forward to making this a memorable
        experience for you and your guests.
      </Text>

      <Text style={muted}>Questions? Reply to this email or reach out to {chefName} directly.</Text>
    </BaseLayout>
  )
}

const heading = {
  fontSize: '24px',
  fontWeight: '600' as const,
  color: '#18181b',
  margin: '0 0 16px',
}
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 16px' }
const detailsTable = { width: '100%', marginBottom: '24px', borderCollapse: 'collapse' as const }
const detailLabel = {
  fontSize: '13px',
  color: '#6b7280',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
  width: '140px',
}
const detailValue = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#18181b',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
}
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
