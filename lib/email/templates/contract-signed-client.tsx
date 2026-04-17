// Contract Signed - Client Confirmation Email
// Sent to the client as a record of their contract signature.
// Q10 fix: clients need an email receipt of their legally binding signature.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  signedAt: string
  eventUrl: string
}

export function ContractSignedClientEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  signedAt,
  eventUrl,
}: Props) {
  return (
    <BaseLayout preview={`Your contract for ${occasion} has been signed`}>
      <Text style={heading}>Contract signed</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        This confirms that you signed the service contract for <strong>{occasion}</strong> with{' '}
        {chefName}.
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
            <td style={detailLabel}>Signed</td>
            <td style={detailValue}>{signedAt}</td>
          </tr>
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
          View Your Event
        </Link>
      </div>

      <Text style={muted}>
        Keep this email for your records. Your signed contract is also available on your event page.
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
