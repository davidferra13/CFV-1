// Event Cancelled Email
// Sent to the other party when an event is cancelled

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type EventCancelledProps = {
  recipientName: string
  occasion: string
  eventDate: string
  cancelledBy: string
  reason: string | null
  brand?: ChefBrandProps
}

export function EventCancelledEmail({
  recipientName,
  occasion,
  eventDate,
  cancelledBy,
  reason,
  brand,
}: EventCancelledProps) {
  return (
    <BaseLayout brand={brand} preview={`${occasion} event has been cancelled`}>
      <Text style={heading}>Event cancelled</Text>
      <Text style={paragraph}>Hi {recipientName},</Text>
      <Text style={paragraph}>
        The <strong>{occasion}</strong> event scheduled for {eventDate} has been cancelled by{' '}
        {cancelledBy}.
      </Text>
      {reason && <Text style={paragraph}>Reason: {reason}</Text>}
      <Text style={muted}>
        If you have any questions about refunds or rescheduling, please reach out through ChefFlow.
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

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
