// Contract Sent — Client Notification Email
// Sent to the client when the chef sends a contract for e-signature.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  clientName: string
  occasion: string
  eventDate: string
  signingUrl: string
}

export function ContractSentEmail({ clientName, occasion, eventDate, signingUrl }: Props) {
  return (
    <BaseLayout preview={`Your service contract is ready to sign — ${occasion}`}>
      <Text style={heading}>Your contract is ready</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Your chef has prepared a service agreement for <strong>{occasion}</strong> on{' '}
        <strong>{eventDate}</strong>. Please review and sign it at your earliest convenience.
      </Text>

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={signingUrl}
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
          Review &amp; Sign Contract
        </Link>
      </div>

      <Text style={muted}>
        This link takes you to a secure page where you can read the full contract and add your
        signature. The event will not be finalized until the contract is signed.
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
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
