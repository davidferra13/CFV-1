// Post-Event Referral Ask Email
// Sent 14 days after event completion via Inngest background job.
// Warm, non-pushy request to spread the word — leverages word-of-mouth.

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type PostEventReferralAskProps = {
  clientName: string
  chefName: string
  occasion: string
  bookingUrl: string
  brand?: ChefBrandProps
}

export function PostEventReferralAskEmail({
  clientName,
  chefName,
  occasion,
  bookingUrl,
  brand,
}: PostEventReferralAskProps) {
  return (
    <BaseLayout brand={brand} preview={`Know someone who'd love a private chef experience?`}>
      <Text style={heading}>Share the experience</Text>

      <Text style={paragraph}>Hi {clientName},</Text>

      <Text style={paragraph}>
        It has been two weeks since your <strong>{occasion}</strong> with{' '}
        <strong>{chefName}</strong>, and we wanted to reach out one last time.
      </Text>

      <Text style={paragraph}>
        The best compliment a chef can receive is a recommendation to someone you care about. If you
        know a friend, family member, or colleague who would enjoy a private dining experience, we
        would be honored to cook for them too.
      </Text>

      <Button style={primaryButton} href={bookingUrl}>
        Share with a Friend
      </Button>

      <Hr style={divider} />

      <Text style={paragraph}>
        Simply forward this email or share the link above. No pressure — just a gentle invitation to
        spread the joy of great food.
      </Text>

      <Text style={muted}>
        Thank you for being a wonderful guest.
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
