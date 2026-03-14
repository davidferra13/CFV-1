// Quote Rejected — Chef Notification Email
// Sent to the chef when a client declines a quote.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  chefName: string
  clientName: string
  quoteName: string
  rejectionReason: string | null
  inquiryUrl: string
}

export function QuoteRejectedChefEmail({
  chefName,
  clientName,
  quoteName,
  rejectionReason,
  inquiryUrl,
}: Props) {
  return (
    <BaseLayout preview={`${clientName} declined your quote`}>
      <Text style={heading}>Quote declined</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        <strong>{clientName}</strong> has declined your quote for <strong>{quoteName}</strong>.
      </Text>

      {rejectionReason && (
        <table style={detailsTable}>
          <tbody>
            <tr>
              <td style={detailLabel}>Their reason</td>
              <td style={detailValue}>{rejectionReason}</td>
            </tr>
          </tbody>
        </table>
      )}

      <Text style={paragraph}>
        You may want to follow up to understand their concerns or offer an alternative proposal.
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
        Consider sending a revised quote or reaching out directly to keep the conversation going.
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
  color: '#18181b',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
}
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
