// Event Accepted Email
// Sent to client when they accept a proposal (proposed -> accepted)

import { Button, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type EventAcceptedProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  eventUrl: string
}

export function EventAcceptedEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  eventUrl,
}: EventAcceptedProps) {
  return (
    <BaseLayout preview={`You accepted the proposal for ${occasion}`}>
      <Text style={heading}>Proposal accepted</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        You have accepted the proposal for <strong>{occasion}</strong> on {eventDate}. {chefName}{' '}
        will follow up with next steps, including payment details and final confirmation.
      </Text>
      <Text style={paragraph}>
        You can view event details and track progress anytime from your portal.
      </Text>
      <Button style={button} href={eventUrl}>
        View Event
      </Button>
      <Text style={authNote}>
        You may need to sign in or create a free account to view your event details.
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
  marginBottom: '12px',
}

const authNote = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0 0 24px',
  lineHeight: '1.5',
}
