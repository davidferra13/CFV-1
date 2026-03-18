// Payment Received - Chef Notification Email
// Sent to the chef when a client pays via Stripe.
// Complements the existing in-app notification.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  chefName: string
  clientName: string
  amountFormatted: string
  paymentType: string // 'deposit', 'balance', or 'full'
  occasion: string
  eventDate: string // Already formatted
  eventUrl: string
  remainingBalanceFormatted: string | null
}

export function PaymentReceivedChefEmail({
  chefName,
  clientName,
  amountFormatted,
  paymentType,
  occasion,
  eventDate,
  eventUrl,
  remainingBalanceFormatted,
}: Props) {
  const paymentLabel = paymentType === 'deposit' ? 'deposit' : 'payment'

  return (
    <BaseLayout preview={`${amountFormatted} ${paymentLabel} received from ${clientName}`}>
      <Text style={heading}>Payment received</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        <strong>{clientName}</strong> has paid a {paymentLabel} of{' '}
        <strong>{amountFormatted}</strong> for {occasion}.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Amount</td>
            <td style={detailValue}>{amountFormatted}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Type</td>
            <td style={detailValue}>
              {paymentLabel.charAt(0).toUpperCase() + paymentLabel.slice(1)}
            </td>
          </tr>
          <tr>
            <td style={detailLabel}>Client</td>
            <td style={detailValue}>{clientName}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Event</td>
            <td style={detailValue}>{occasion}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Event date</td>
            <td style={detailValue}>{eventDate}</td>
          </tr>
          {remainingBalanceFormatted && (
            <tr>
              <td style={detailLabel}>Remaining balance</td>
              <td style={detailValue}>{remainingBalanceFormatted}</td>
            </tr>
          )}
        </tbody>
      </table>

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
          View Event
        </Link>
      </div>

      <Text style={muted}>
        {paymentType === 'deposit' && remainingBalanceFormatted
          ? `The remaining balance of ${remainingBalanceFormatted} will be collected before the event.`
          : 'The event is now fully paid. Confirm the event when ready.'}
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
