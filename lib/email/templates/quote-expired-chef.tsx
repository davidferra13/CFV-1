// Quote Expired — Chef Notification Email
// Sent to the chef when a quote has passed its valid-until date with no client response.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  chefName: string
  clientName: string
  quoteName: string
  inquiryUrl: string
}

export function QuoteExpiredChefEmail({ chefName, clientName, quoteName, inquiryUrl }: Props) {
  return (
    <BaseLayout preview={`Your quote for ${clientName} has expired`}>
      <Text style={heading}>Quote expired</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        Your quote <strong>{quoteName}</strong> for <strong>{clientName}</strong> has expired
        without a response.
      </Text>

      <Text style={paragraph}>
        If you'd still like to work with this client, you can send a revised quote or reach out
        directly to check in.
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

      <Text style={muted}>You can reopen this inquiry and send a new quote at any time.</Text>
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
