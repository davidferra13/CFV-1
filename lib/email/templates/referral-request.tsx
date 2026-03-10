// Referral Request Email Template
// Sent after a successful event to encourage word-of-mouth referrals.
// Warm, professional, non-pushy. No em dashes.

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type ReferralRequestEmailProps = {
  clientName: string
  chefName: string
  occasion: string
  referralUrl: string
  brand?: ChefBrandProps
}

export function ReferralRequestEmail({
  clientName,
  chefName,
  occasion,
  referralUrl,
  brand,
}: ReferralRequestEmailProps) {
  return (
    <BaseLayout brand={brand} preview="Know someone who would love a private chef experience?">
      <Text style={heading}>Share the experience</Text>

      <Text style={paragraph}>Hi {clientName},</Text>

      <Text style={paragraph}>
        Thank you for a wonderful <strong>{occasion}</strong>! It was a pleasure cooking for you and
        your guests.
      </Text>

      <Text style={paragraph}>
        If you know a friend, family member, or colleague who would enjoy a private dining
        experience, we would be honored to cook for them too. The best compliment a chef can receive
        is a recommendation to someone you care about.
      </Text>

      <Button style={primaryButton} href={referralUrl}>
        Share with a Friend
      </Button>

      <Hr style={divider} />

      <Text style={paragraph}>
        Simply share the link above. No pressure, just a gentle invitation to spread the joy of
        great food.
      </Text>

      <Text style={muted}>
        With gratitude,
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
