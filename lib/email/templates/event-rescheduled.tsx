// Event Rescheduled Email
// Sent to client, staff, or vendors when an event date changes

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type EventRescheduledProps = {
  recipientName: string
  occasion: string
  originalDate: string
  newDate: string
}

export function EventRescheduledEmail({
  recipientName,
  occasion,
  originalDate,
  newDate,
}: EventRescheduledProps) {
  return (
    <BaseLayout preview={`${occasion} has been rescheduled to ${newDate}`}>
      <Text style={heading}>Event rescheduled</Text>
      <Text style={paragraph}>Hi {recipientName},</Text>
      <Text style={paragraph}>
        <strong>{occasion}</strong> has been moved from {originalDate} to <strong>{newDate}</strong>
        .
      </Text>
      <Text style={paragraph}>
        Please update your calendar accordingly. If this new date does not work for you, reach out
        through ChefFlow as soon as possible.
      </Text>
      <Text style={muted}>This is an automated notification from ChefFlow.</Text>
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

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
