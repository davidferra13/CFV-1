// Quote Expired — Client Notification Email
// Sent to the client when their received quote has passed its valid-until date.

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  clientName: string
  chefName: string
  quoteName: string
  chefEmail: string | null
}

export function QuoteExpiredClientEmail({ clientName, chefName, quoteName, chefEmail }: Props) {
  return (
    <BaseLayout preview={`Your quote from ${chefName} has expired`}>
      <Text style={heading}>Quote expired</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        The quote <strong>{quoteName}</strong> from <strong>{chefName}</strong> has expired. Quotes
        are only valid for a limited time to allow for scheduling and availability.
      </Text>

      <Text style={paragraph}>
        If you're still interested in booking, please reach out to {chefName} directly
        {chefEmail ? (
          <>
            {' '}
            at <strong>{chefEmail}</strong>
          </>
        ) : null}{' '}
        to request a new quote.
      </Text>

      <Text style={muted}>We hope to connect you with {chefName} soon.</Text>
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
