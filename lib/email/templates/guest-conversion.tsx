// Guest Conversion Email
// Sent 3 days after a guest rates 4+ stars on post-event feedback.
// Warm invitation for the guest to book their own private dining experience.

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type GuestConversionEmailProps = {
  guestName: string
  chefName: string
  occasion: string
  inquiryUrl: string
}

export function GuestConversionEmail({
  guestName,
  chefName,
  occasion,
  inquiryUrl,
}: GuestConversionEmailProps) {
  return (
    <BaseLayout preview={`Book your own experience with ${chefName}`}>
      <Text style={heading}>Your own private dining experience</Text>

      <Text style={paragraph}>Hi {guestName},</Text>

      <Text style={paragraph}>
        We are glad you enjoyed the <strong>{occasion}</strong> with{' '}
        <strong>{chefName}</strong>. Many guests tell us it was one of the most memorable meals
        they have had.
      </Text>

      <Text style={paragraph}>
        If you have ever thought about hosting your own private dinner, celebration, or meal prep
        session, {chefName} would love to cook for you. Just share a few details and we will put
        together a custom proposal.
      </Text>

      <Button style={primaryButton} href={inquiryUrl}>
        Plan Your Experience
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
