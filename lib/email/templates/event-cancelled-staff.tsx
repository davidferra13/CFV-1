// Event Cancelled Staff/Vendor Email
// Sent to assigned staff and vendors when an event is cancelled

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type EventCancelledStaffProps = {
  recipientName: string
  occasion: string
  eventDate: string
  cancelledBy: string
  reason: string | null
}

export function EventCancelledStaffEmail({
  recipientName,
  occasion,
  eventDate,
  cancelledBy,
  reason,
}: EventCancelledStaffProps) {
  return (
    <BaseLayout preview={`${occasion} on ${eventDate} has been cancelled`}>
      <Text style={heading}>Event cancelled</Text>
      <Text style={paragraph}>Hi {recipientName},</Text>
      <Text style={paragraph}>
        <strong>{occasion}</strong> scheduled for {eventDate} has been cancelled by the{' '}
        {cancelledBy}.
      </Text>
      {reason && <Text style={paragraph}>Reason: {reason}</Text>}
      <Text style={paragraph}>
        You no longer need to prepare for this event. If you have any questions or concerns, please
        reach out to the chef directly.
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
