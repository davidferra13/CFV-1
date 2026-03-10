// Reservation Confirmation Email
// Sent to guest when a reservation is confirmed.

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type ReservationConfirmationProps = {
  guestName: string
  restaurantName: string
  date: string
  time: string
  partySize: number
  tableNumber?: string
  brand?: ChefBrandProps
}

export function ReservationConfirmationEmail({
  guestName,
  restaurantName,
  date,
  time,
  partySize,
  tableNumber,
  brand,
}: ReservationConfirmationProps) {
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <BaseLayout brand={brand} preview={`Your reservation at ${restaurantName} is confirmed!`}>
      <Text style={heading}>Your reservation is confirmed!</Text>
      <Text style={paragraph}>Hi {guestName},</Text>
      <Text style={paragraph}>
        We are looking forward to seeing you at <strong>{restaurantName}</strong>. Here are your
        reservation details:
      </Text>
      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Date</td>
            <td style={detailValue}>{formattedDate}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Time</td>
            <td style={detailValue}>{time}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Party size</td>
            <td style={detailValue}>
              {partySize} {partySize === 1 ? 'guest' : 'guests'}
            </td>
          </tr>
          {tableNumber && (
            <tr>
              <td style={detailLabel}>Table</td>
              <td style={detailValue}>{tableNumber}</td>
            </tr>
          )}
        </tbody>
      </table>
      <Text style={paragraph}>
        If you need to modify or cancel your reservation, please contact us directly. We kindly ask
        for at least 2 hours notice for cancellations.
      </Text>
      <Text style={muted}>See you soon!</Text>
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
