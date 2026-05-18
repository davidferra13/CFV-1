// Dietary Confirmation Email
// Sent to individual guests before an event to confirm allergies/dietary needs.
// Single CTA: confirm your dietary needs (token-based link, no login required).

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type DietaryConfirmationEmailProps = {
  guestName: string
  occasion: string
  eventDate: string
  confirmUrl: string
}

export function DietaryConfirmationEmail({
  guestName,
  occasion,
  eventDate,
  confirmUrl,
}: DietaryConfirmationEmailProps) {
  return (
    <BaseLayout preview={`Confirm your dietary needs for ${occasion}`}>
      <Text style={heading}>Dietary Confirmation</Text>

      <Text style={paragraph}>Hi {guestName},</Text>

      <Text style={paragraph}>
        You are invited to a <strong>{occasion}</strong> on <strong>{eventDate}</strong>. To make
        sure everything is prepared with your needs in mind, please take a moment to confirm any
        dietary restrictions or allergies.
      </Text>

      <Text style={paragraph}>
        This only takes about 30 seconds and helps your chef prepare a safe, enjoyable meal for
        everyone.
      </Text>

      <Button style={primaryButton} href={confirmUrl}>
        Confirm My Dietary Needs
      </Button>

      <Hr style={divider} />

      <Text style={muted}>
        This link is unique to you and does not require a login. It will expire in 14 days. If you
        have no dietary restrictions, you can simply click the link and submit the form as-is.
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
}
