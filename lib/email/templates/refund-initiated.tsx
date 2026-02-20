// Refund Initiated Email
// Sent to client when chef initiates a refund (Stripe or offline)

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  clientName: string
  chefName: string
  amountFormatted: string
  reason: string
  isStripeRefund: boolean   // true = Stripe (3-5 days), false = offline (immediate)
  occasion: string
  eventDate: string         // Already formatted
}

export function RefundInitiatedEmail({
  clientName,
  chefName,
  amountFormatted,
  reason,
  isStripeRefund,
  occasion,
  eventDate,
}: Props) {
  return (
    <BaseLayout preview={`Refund of ${amountFormatted} has been initiated`}>
      <Text style={heading}>Refund initiated</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        {chefName} has initiated a refund of <strong>{amountFormatted}</strong> for the cancelled{' '}
        {occasion}.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Refund amount</td>
            <td style={detailValue}>{amountFormatted}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Event</td>
            <td style={detailValue}>{occasion}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Event date</td>
            <td style={detailValue}>{eventDate}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Reason</td>
            <td style={detailValue}>{reason}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Processing time</td>
            <td style={detailValue}>
              {isStripeRefund
                ? '3–5 business days (returned to original payment method)'
                : 'Cash/offline refund — confirm receipt with your chef'}
            </td>
          </tr>
        </tbody>
      </table>

      {isStripeRefund && (
        <Text style={paragraph}>
          The refund will be returned to your original payment method. Processing times may vary by
          bank — typically within a week of this notice.
        </Text>
      )}

      <Text style={muted}>
        If you have questions about this refund, please reach out to {chefName} through the CheFlow
        portal.
      </Text>
    </BaseLayout>
  )
}

const heading = { fontSize: '24px', fontWeight: '600' as const, color: '#18181b', margin: '0 0 16px' }
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 16px' }
const detailsTable = { width: '100%', marginBottom: '24px', borderCollapse: 'collapse' as const }
const detailLabel = { fontSize: '13px', color: '#6b7280', padding: '8px 0', borderBottom: '1px solid #f3f4f6', width: '140px' }
const detailValue = { fontSize: '15px', fontWeight: '600' as const, color: '#18181b', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
