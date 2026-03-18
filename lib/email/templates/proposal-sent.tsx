// Proposal Sent - Client Notification Email
// Sent to the client when the chef sends a unified proposal
// (event details + menu + contract + payment - all in one link).

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface ProposalSentEmailProps {
  clientName: string
  occasion: string
  eventDate: string
  chefName: string
  proposalUrl: string
}

export function ProposalSentEmail({
  clientName,
  occasion,
  eventDate,
  chefName,
  proposalUrl,
}: ProposalSentEmailProps) {
  return (
    <BaseLayout preview={`${chefName} sent you a proposal for ${occasion}`}>
      <Text style={heading}>Your proposal is ready</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        {chefName} has sent you a complete proposal for your <strong>{occasion}</strong> on{' '}
        <strong>{eventDate}</strong>.
      </Text>
      <Text style={paragraph}>
        Review the event details, menu, contract, and payment all in one place:
      </Text>

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={proposalUrl}
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
          View Your Proposal
        </Link>
      </div>

      <Text style={muted}>
        This link takes you to a secure page where you can review everything and take the next steps
        at your own pace.
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
