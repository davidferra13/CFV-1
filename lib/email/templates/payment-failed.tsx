// Payment Failed Email
// Sent to client when Stripe payment fails

import { Button, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type PaymentFailedProps = {
  clientName: string
  occasion: string
  errorMessage: string | null
  retryUrl: string
}

export function PaymentFailedEmail({
  clientName,
  occasion,
  errorMessage,
  retryUrl,
}: PaymentFailedProps) {
  return (
    <BaseLayout preview={`Payment failed for ${occasion}`}>
      <Text style={heading}>Payment unsuccessful</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Your payment for <strong>{occasion}</strong> could not be processed.
        {errorMessage && ` Reason: ${errorMessage}.`}
      </Text>
      <Text style={paragraph}>
        Please try again with a different payment method or contact your bank for more information.
      </Text>
      <Button style={button} href={retryUrl}>
        Retry Payment
      </Button>
      <Text style={muted}>
        If you continue to have trouble, please reach out to your chef through CheFlow.
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

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
}

const button = {
  backgroundColor: '#18181b',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block' as const,
  marginBottom: '24px',
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
