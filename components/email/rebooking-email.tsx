// Rebooking Nudge Email
// Step 2 in the follow-up sequence (Day 14 after event).
// Gentle, not pushy. Personal and conversational.

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from '@/lib/email/templates/base-layout'

type RebookingNudgeProps = {
  clientName: string
  chefName: string
  lastEventDate: string
  bookingUrl: string
}

export function RebookingNudgeEmail({
  clientName,
  chefName,
  lastEventDate,
  bookingUrl,
}: RebookingNudgeProps) {
  return (
    <BaseLayout preview={`${chefName} would love to cook for you again`}>
      <Text style={heading}>Ready for round two?</Text>

      <Text style={paragraph}>Hi {clientName},</Text>

      <Text style={paragraph}>
        It has been a couple of weeks since {chefName} cooked for you
        {lastEventDate ? ` on ${lastEventDate}` : ''}, and we have been thinking about what to make
        for you next.
      </Text>

      <Text style={paragraph}>
        Whether it is a birthday coming up, a dinner party with friends, or just a weeknight where
        you want something special, we would love to be part of it.
      </Text>

      <Text style={paragraph}>
        No commitment needed. Just pick a date and we will take it from there.
      </Text>

      <Button style={primaryButton} href={bookingUrl}>
        Pick a Date
      </Button>

      <Hr style={divider} />

      <Text style={muted}>
        Looking forward to cooking for you again.
        <br />
        {chefName} via ChefFlow
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
