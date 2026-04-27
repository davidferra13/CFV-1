// Event Contact Notification Email
// Sent to planners, assistants, and other event contacts
// when key event communications are dispatched.

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type EventContactNotificationProps = {
  contactName: string
  role: string
  headline: string
  details: string
}

const ROLE_LABELS: Record<string, string> = {
  planner: 'Event Planner',
  venue_manager: 'Venue Manager',
  host: 'Host',
  coordinator: 'Coordinator',
  assistant: 'Assistant',
  primary: 'Primary Contact',
  other: 'Contact',
}

export function EventContactNotificationEmail({
  contactName,
  role,
  headline,
  details,
}: EventContactNotificationProps) {
  const roleLabel = ROLE_LABELS[role] || 'Contact'

  return (
    <BaseLayout preview={headline}>
      <Text style={heading}>{headline}</Text>
      <Text style={paragraph}>Hi {contactName},</Text>
      <Text style={paragraph}>
        You are receiving this notification as the <strong>{roleLabel}</strong> for this event.
      </Text>
      <Text style={detailsStyle}>{details}</Text>
      <Text style={footerNote}>
        You received this because you are listed as a contact for this event with notifications
        enabled. If you believe this is an error, please contact the chef directly.
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

const detailsStyle = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 24px',
  padding: '12px 16px',
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  borderLeft: '3px solid #18181b',
}

const footerNote = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0 0 24px',
  lineHeight: '1.5',
}
