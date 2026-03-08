// Offline Payment Receipt Email
// Sent to client when chef records an offline payment (cash, Venmo, Zelle, etc.)

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type Props = {
  clientName: string
  chefName: string
  amountFormatted: string
  paymentMethod: string
  entryType: string // 'deposit' or 'payment'
  occasion: string
  eventDate: string // Already formatted
  remainingBalanceFormatted: string | null
  loyaltyTier?: string
  loyaltyPoints?: number
}

export function OfflinePaymentReceiptEmail({
  clientName,
  chefName,
  amountFormatted,
  paymentMethod,
  entryType,
  occasion,
  eventDate,
  remainingBalanceFormatted,
  loyaltyTier,
  loyaltyPoints,
}: Props) {
  const paymentLabel = entryType === 'deposit' ? 'deposit' : 'payment'
  const methodLabel = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)

  return (
    <BaseLayout
      brand={brand}
      preview={`${amountFormatted} ${paymentLabel} recorded for ${occasion}`}
    >
      <Text style={heading}>Payment received</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        {chefName} has recorded a {paymentLabel} of <strong>{amountFormatted}</strong> for your
        upcoming {occasion}. Thank you!
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
            <td style={detailLabel}>Method</td>
            <td style={detailValue}>{methodLabel}</td>
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
          {(loyaltyTier || loyaltyPoints) && (
            <tr>
              <td style={detailLabel}>Loyalty status</td>
              <td style={detailValue}>
                {loyaltyTier
                  ? `${loyaltyTier.charAt(0).toUpperCase() + loyaltyTier.slice(1)} Tier`
                  : ''}
                {loyaltyTier && loyaltyPoints ? ' — ' : ''}
                {loyaltyPoints ? `${loyaltyPoints.toLocaleString()} points` : ''}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Text style={muted}>
        If you have any questions about your payment or upcoming event, reach out to {chefName}{' '}
        directly through the ChefFlow portal.
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
