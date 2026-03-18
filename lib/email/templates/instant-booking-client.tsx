// Instant Booking Confirmation - Client Email
// Sent to the client after they complete an instant booking and payment via the public page.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  guestCount: number
  depositFormatted: string
  totalFormatted: string
  eventUrl: string
}

export function InstantBookingClientEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  guestCount,
  depositFormatted,
  totalFormatted,
  eventUrl,
}: Props) {
  return (
    <BaseLayout preview={`Your booking with ${chefName} is confirmed`}>
      <Text style={heading}>Booking confirmed</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Your booking with <strong>{chefName}</strong> is confirmed and your deposit payment has been
        received. We're looking forward to making your <strong>{occasion}</strong> a great
        experience.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Chef</td>
            <td style={detailValue}>{chefName}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Occasion</td>
            <td style={detailValue}>{occasion}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Date</td>
            <td style={detailValue}>{eventDate}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Guests</td>
            <td style={detailValue}>{guestCount}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Deposit paid</td>
            <td style={detailValue}>{depositFormatted}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Total</td>
            <td style={detailValue}>{totalFormatted}</td>
          </tr>
        </tbody>
      </table>

      <Text style={paragraph}>
        {chefName} will be in touch shortly to confirm final details. You can view your event and
        manage everything from your client portal.
      </Text>

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={eventUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#78350f',
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          View My Event
        </Link>
      </div>

      <Text style={muted}>
        The remaining balance of {totalFormatted} will be collected closer to your event date.
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
