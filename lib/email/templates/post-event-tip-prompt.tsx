// Post-Event Tip Prompt Email
// Sent 2 days after event completion via Inngest background job.
// Casual, no-pressure tone. Links to the public /tip/[token] page.

import { Button, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type PostEventTipPromptProps = {
  clientName: string
  chefName: string
  occasion: string
  tipUrl: string
}

export function PostEventTipPromptEmail({
  clientName,
  chefName,
  occasion,
  tipUrl,
}: PostEventTipPromptProps) {
  return (
    <BaseLayout preview={`Leave a tip for ${chefName}`}>
      <Text style={paragraph}>Hi {clientName},</Text>

      <Text style={paragraph}>
        We hope you enjoyed your <strong>{occasion}</strong> with <strong>{chefName}</strong>. If
        the experience was special, a tip is a wonderful way to show your appreciation directly.
      </Text>

      <Text style={paragraph}>No pressure at all. This is entirely optional.</Text>

      <Button style={primaryButton} href={tipUrl}>
        Leave a Tip
      </Button>

      <Text style={muted}>
        Thank you,
        <br />
        {chefName} via ChefFlow
      </Text>
    </BaseLayout>
  )
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
}

const primaryButton = {
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
  lineHeight: '1.5',
}
