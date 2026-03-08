// Payment Reminder Email
// Sent automatically by lifecycle cron when payment hasn't been received
// before key thresholds (7 days, 3 days, 1 day before event).

import { Text, Link, Button } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type Props = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string // Already formatted
  daysUntilEvent: number // 7, 3, or 1
  amountDueFormatted: string
  depositAmountFormatted: string | null
  paymentUrl: string
}

export function PaymentReminderEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  daysUntilEvent,
  amountDueFormatted,
  depositAmountFormatted,
  paymentUrl,
}: Props) {
  const urgency = daysUntilEvent === 1 ? 'urgent' : daysUntilEvent <= 3 ? 'soon' : 'upcoming'
  const subjectHint =
    daysUntilEvent === 1 ? 'Payment due today' : `Payment due in ${daysUntilEvent} days`

  const headingText =
    daysUntilEvent === 1
      ? 'Final payment reminder'
      : daysUntilEvent <= 3
        ? 'Payment due soon'
        : 'Payment reminder'

  return (
    <BaseLayout brand={brand} preview={`${subjectHint} — ${occasion} with ${chefName}`}>
      <Text style={heading}>{headingText}</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Your {occasion} with {chefName} is{' '}
        {daysUntilEvent === 1 ? 'tomorrow' : `in ${daysUntilEvent} days`} ({eventDate}) and payment
        has not yet been received.
        {depositAmountFormatted
          ? ` A deposit of ${depositAmountFormatted} is required to secure your booking.`
          : ` The full amount of ${amountDueFormatted} is due before the event.`}
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Event</td>
            <td style={detailValue}>{occasion}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Date</td>
            <td style={detailValue}>{eventDate}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Amount due</td>
            <td style={detailValue}>{amountDueFormatted}</td>
          </tr>
          {depositAmountFormatted && (
            <tr>
              <td style={detailLabel}>Deposit required</td>
              <td style={detailValue}>{depositAmountFormatted}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={paymentUrl}
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
          Pay Now
        </Link>
      </div>

      {urgency === 'urgent' && (
        <Text style={{ ...paragraph, color: '#dc2626', fontWeight: '600' as const }}>
          If payment is not received, your booking may be at risk. Please complete payment as soon
          as possible.
        </Text>
      )}

      <Text style={muted}>
        If you have already arranged payment with {chefName} directly (cash, Venmo, etc.), you can
        ignore this reminder. Questions? Reach out through the ChefFlow portal.
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
