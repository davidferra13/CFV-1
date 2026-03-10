// Subscription Payment Failed Email
// Sent to client when recurring autopay fails

import { Button, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type SubscriptionPaymentFailedProps = {
  clientName: string
  amountFormatted: string
  updateUrl: string
  brand?: ChefBrandProps
}

export function SubscriptionPaymentFailedEmail({
  clientName,
  amountFormatted,
  updateUrl,
  brand,
}: SubscriptionPaymentFailedProps) {
  return (
    <BaseLayout brand={brand} preview={`We couldn't process your payment of ${amountFormatted}`}>
      <Text style={heading}>We couldn't process your payment</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Your recurring meal prep payment of <strong>{amountFormatted}</strong> could not be
        processed. This could happen if your card expired or if there are insufficient funds.
      </Text>
      <Text style={paragraph}>
        Please update your payment method or contact your chef if you have questions.
      </Text>
      <Button style={button} href={updateUrl}>
        View My Account
      </Button>
      <Text style={muted}>
        Your meal prep service will continue, but your chef may follow up about the outstanding
        balance. If you need help, reach out through ChefFlow.
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
