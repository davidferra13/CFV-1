// Event Completed Email
// Sent to client when chef marks event as completed — prompts for review

import { Button, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type EventCompletedProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  reviewUrl: string
}

export function EventCompletedEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  reviewUrl,
}: EventCompletedProps) {
  return (
    <BaseLayout preview={`How was your ${occasion}?`}>
      <Text style={heading}>Thank you!</Text>
      <Text style={paragraph}>
        Hi {clientName},
      </Text>
      <Text style={paragraph}>
        We hope you enjoyed your <strong>{occasion}</strong> on {eventDate} with{' '}
        <strong>{chefName}</strong>. Your feedback means a lot — it helps your chef continue
        to deliver amazing experiences.
      </Text>
      <Button style={button} href={reviewUrl}>
        Leave a Review
      </Button>
      <Text style={muted}>
        Sharing your experience only takes a minute and makes a big difference. Thank you
        for choosing CheFlow!
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
