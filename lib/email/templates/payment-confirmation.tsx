// Payment Confirmation Email
// Sent to client after successful payment via Stripe

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type PaymentConfirmationProps = {
  clientName: string
  amountFormatted: string
  paymentType: string
  occasion: string
  eventDate: string | null
  remainingBalanceFormatted: string | null
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null
  loyaltyPoints?: number | null
  brand?: ChefBrandProps
}

export function PaymentConfirmationEmail({
  clientName,
  amountFormatted,
  paymentType,
  occasion,
  eventDate,
  remainingBalanceFormatted,
  loyaltyTier,
  loyaltyPoints,
  brand,
}: PaymentConfirmationProps) {
  return (
    <BaseLayout brand={brand} preview={`Payment of ${amountFormatted} received`}>
      <Text style={heading}>Payment confirmed</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Your {paymentType} of <strong>{amountFormatted}</strong> for {occasion} has been received.
        Thank you!
      </Text>
      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Amount</td>
            <td style={detailValue}>{amountFormatted}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Type</td>
            <td style={detailValue}>{paymentType}</td>
          </tr>
          {eventDate && (
            <tr>
              <td style={detailLabel}>Event date</td>
              <td style={detailValue}>{eventDate}</td>
            </tr>
          )}
          {remainingBalanceFormatted && (
            <tr>
              <td style={detailLabel}>Remaining</td>
              <td style={detailValue}>{remainingBalanceFormatted}</td>
            </tr>
          )}
          {(loyaltyTier || typeof loyaltyPoints === 'number') && (
            <tr>
              <td style={detailLabel}>Loyalty</td>
              <td style={detailValue}>
                {loyaltyTier ? `${loyaltyTier} tier` : 'Member'}
                {typeof loyaltyPoints === 'number'
                  ? ` - ${loyaltyPoints.toLocaleString()} points`
                  : ''}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Text style={muted}>
        Your chef will be in touch to confirm the remaining details. If you have questions, reach
        out to your chef directly through ChefFlow.
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
