// Post-Event Review Request Email
// Sent 7 days after event completion via Inngest background job.
// Friendly nudge to leave a review — helps the chef build their reputation.

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type PostEventReviewRequestProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  reviewUrl: string
  brand?: ChefBrandProps
}

export function PostEventReviewRequestEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  reviewUrl,
  brand,
}: PostEventReviewRequestProps) {
  return (
    <BaseLayout brand={brand} preview={`Your feedback means the world to ${chefName}`}>
      <Text style={heading}>How was your experience?</Text>

      <Text style={paragraph}>Hi {clientName},</Text>

      <Text style={paragraph}>
        A week ago, <strong>{chefName}</strong> had the pleasure of cooking for your{' '}
        <strong>{occasion}</strong> on {eventDate}. We hope the memories are still fresh — and
        delicious.
      </Text>

      <Text style={paragraph}>
        If you have a moment, a quick review would mean the world. It helps {chefName} continue
        refining their craft and lets other hosts discover what makes their cooking special.
      </Text>

      <Button style={primaryButton} href={reviewUrl}>
        Leave a Review
      </Button>

      <Hr style={divider} />

      <Text style={muted}>
        It only takes a minute. Your honest feedback — whether it is praise, suggestions, or both —
        is genuinely valued.
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
