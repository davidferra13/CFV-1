// Contract Signed - Chef Notification Email
// Sent to the chef when a client signs their event contract.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  chefName: string
  clientName: string
  occasion: string
  eventDate: string
  eventUrl: string
}

export function ContractSignedChefEmail({
  chefName,
  clientName,
  occasion,
  eventDate,
  eventUrl,
}: Props) {
  return (
    <BaseLayout preview={`${clientName} signed the contract for ${occasion}`}>
      <Text style={heading}>Contract signed</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        Great news - <strong>{clientName}</strong> has signed the service contract for{' '}
        <strong>{occasion}</strong>.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Client</td>
            <td style={detailValue}>{clientName}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Event</td>
            <td style={detailValue}>{occasion}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Date</td>
            <td style={detailValue}>{eventDate}</td>
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
          View Event
        </Link>
      </div>

      <Text style={muted}>The signed contract is available on the event detail page.</Text>
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
