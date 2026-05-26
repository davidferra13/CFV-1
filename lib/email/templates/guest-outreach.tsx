// Guest Outreach Email
// Sent as batch outreach to guest leads who scanned QR codes at events.
// Warm, personal, short. Invites them to book their own experience.

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type GuestOutreachEmailProps = {
  guestName: string
  chefName: string
  occasion: string
  inquiryUrl: string
}

export function GuestOutreachEmail({
  guestName,
  chefName,
  occasion,
  inquiryUrl,
}: GuestOutreachEmailProps) {
  return (
    <BaseLayout preview={`${chefName} would love to cook for you again`}>
      <Text style={heading}>Thanks for joining us</Text>

      <Text style={paragraph}>Hi {guestName},</Text>

      <Text style={paragraph}>
        Thank you for being part of <strong>{occasion}</strong>! It was a real pleasure having you
        at the table.
      </Text>

      <Text style={paragraph}>
        If you enjoyed the experience and have ever thought about hosting your own private dining
        event, I would love to cook for you. Whether it is an intimate dinner, a celebration, or a
        gathering with friends, just share a few details and I will put together something special.
      </Text>

      <Button style={primaryButton} href={inquiryUrl}>
        Book Your Own Experience
      </Button>

      <Hr style={divider} />

      <Text style={muted}>
        No commitment required. Just tell us your date, guest count, and preferences.
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
