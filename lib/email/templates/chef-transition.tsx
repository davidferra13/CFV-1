// Chef Transition Email
// Sent to a client when their event is being handled by a different chef

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type ChefTransitionProps = {
  clientName: string
  originalChefName: string
  newChefName: string
  occasion: string
  eventDate: string
  personalNote: string | null
}

export function ChefTransitionEmail({
  clientName,
  originalChefName,
  newChefName,
  occasion,
  eventDate,
  personalNote,
}: ChefTransitionProps) {
  return (
    <BaseLayout preview={`Update about your ${occasion} event on ${eventDate}`}>
      <Text style={heading}>A quick update about your upcoming event</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        I wanted to let you know that {newChefName} will be taking care of your {occasion} event on{' '}
        {eventDate}. {originalChefName} personally selected {newChefName} for you and has shared all
        the details about your event, menu, and preferences to make sure everything goes smoothly.
      </Text>
      <Text style={paragraph}>
        Your menu and all the plans you have discussed remain the same. {newChefName} is fully
        briefed and ready to deliver a wonderful experience for you and your guests.
      </Text>
      {personalNote && (
        <Text style={noteStyle}>
          A note from {originalChefName}: {personalNote}
        </Text>
      )}
      <Text style={paragraph}>
        If you have any questions or would like to connect with {newChefName} beforehand, just reply
        to this email.
      </Text>
      <Text style={muted}>Sent via ChefFlow</Text>
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

const noteStyle = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
  padding: '12px 16px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  borderLeft: '3px solid #d1d5db',
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
