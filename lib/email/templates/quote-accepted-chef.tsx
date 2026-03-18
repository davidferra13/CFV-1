// Quote Accepted - Chef Notification Email
// Sent to the chef when a client formally accepts a quote.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  chefName: string
  clientName: string
  quoteName: string
  totalFormatted: string
  depositRequired: boolean
  depositFormatted: string | null
  inquiryUrl: string
}

export function QuoteAcceptedChefEmail({
  chefName,
  clientName,
  quoteName,
  totalFormatted,
  depositRequired,
  depositFormatted,
  inquiryUrl,
}: Props) {
  return (
    <BaseLayout preview={`${clientName} accepted your quote`}>
      <Text style={heading}>Quote accepted</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        Great news - <strong>{clientName}</strong> has accepted your quote for{' '}
        <strong>{quoteName}</strong>.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Client</td>
            <td style={detailValue}>{clientName}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Quote</td>
            <td style={detailValue}>{quoteName}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Total</td>
            <td style={detailValue}>{totalFormatted}</td>
          </tr>
          {depositRequired && depositFormatted && (
            <tr>
              <td style={detailLabel}>Deposit due</td>
              <td style={detailValue}>{depositFormatted}</td>
            </tr>
          )}
        </tbody>
      </table>

      <Text style={paragraph}>
        {depositRequired
          ? `A deposit of ${depositFormatted} is due. Once received, you can confirm the event.`
          : 'No deposit required. Propose the event when you are ready to confirm the date and details.'}
      </Text>

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={inquiryUrl}
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
          View Inquiry
        </Link>
      </div>

      <Text style={muted}>
        Next step: propose the event to lock in the date and share event details with your client.
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
