// Post-Event Survey Email
// Sent to client when an event transitions to completed.
// Single CTA: share your feedback (survey link).

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type PostEventSurveyEmailProps = {
  clientName: string
  chefName: string
  occasion: string
  surveyUrl: string
}

export function PostEventSurveyEmail({
  clientName,
  chefName,
  occasion,
  surveyUrl,
}: PostEventSurveyEmailProps) {
  return (
    <BaseLayout preview={`How was your ${occasion} with ${chefName}?`}>
      <Text style={heading}>How was your experience?</Text>

      <Text style={paragraph}>Hi {clientName},</Text>

      <Text style={paragraph}>
        Thank you for having <strong>{chefName}</strong> for your <strong>{occasion}</strong>. We
        hope it was everything you imagined.
      </Text>

      <Text style={paragraph}>
        Your feedback takes less than 2 minutes and helps <strong>{chefName}</strong> continue
        delivering exceptional experiences.
      </Text>

      <Button style={primaryButton} href={surveyUrl}>
        Share Your Feedback
      </Button>

      <Hr style={divider} />

      <Text style={muted}>
        This link is unique to you. The survey is optional and takes about 90 seconds to complete.
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
}
