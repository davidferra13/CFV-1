// Post-Event Thank You Follow-Up Email
// Step 1 in the follow-up sequence (Day 1 after event).
// Warm, genuine, short. Not corporate, not AI-sounding.

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from '@/lib/email/templates/base-layout'

type ThankYouFollowUpProps = {
  clientName: string
  chefName: string
  eventTitle: string
  eventDate: string
  bookAgainUrl: string
}

export function ThankYouFollowUpEmail({
  clientName,
  chefName,
  eventTitle,
  eventDate,
  bookAgainUrl,
}: ThankYouFollowUpProps) {
  return (
    <BaseLayout preview={`${chefName} wanted to say thank you`}>
      <Text style={heading}>Thank you</Text>

      <Text style={paragraph}>Hi {clientName},</Text>

      <Text style={paragraph}>
        Just a quick note from {chefName}. Cooking for your <strong>{eventTitle}</strong>
        {eventDate ? ` on ${eventDate}` : ''} was a real pleasure, and we hope you and your guests
        enjoyed every bite.
      </Text>

      <Text style={paragraph}>
        If anything stood out (or if there is anything we could do better next time), we would
        genuinely love to hear about it. Just reply to this email.
      </Text>

      <Hr style={divider} />

      <Text style={paragraph}>Whenever you are ready for your next gathering, we are here.</Text>

      <Button style={primaryButton} href={bookAgainUrl}>
        Book Again
      </Button>

      <Text style={muted}>
        Warmly,
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
