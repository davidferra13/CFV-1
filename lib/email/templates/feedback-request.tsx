// Feedback Request Email
// Sent after service completion to collect client ratings and comments.

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type FeedbackRequestEmailProps = {
  clientName: string
  chefName: string
  entityDescription: string // e.g. "dinner party on March 5"
  feedbackUrl: string
  brand?: ChefBrandProps
}

export function FeedbackRequestEmail({
  clientName,
  chefName,
  entityDescription,
  feedbackUrl,
  brand,
}: FeedbackRequestEmailProps) {
  return (
    <BaseLayout brand={brand} preview={`How did we do? Rate your experience with ${chefName}`}>
      <Text style={heading}>How did we do?</Text>

      <Text style={paragraph}>Hi {clientName},</Text>

      <Text style={paragraph}>
        Thank you for choosing <strong>{chefName}</strong> for your {entityDescription}. We hope
        everything exceeded your expectations.
      </Text>

      <Text style={paragraph}>
        Your feedback helps us keep improving. It only takes a minute, and your honest thoughts
        (whether praise, suggestions, or both) are genuinely appreciated.
      </Text>

      <Button style={primaryButton} href={feedbackUrl}>
        Rate Your Experience
      </Button>

      <Hr style={divider} />

      <Text style={muted}>
        This link is unique to your experience. You can submit your feedback at any time.
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

const divider = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '24px 0',
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
  lineHeight: '1.5',
}
