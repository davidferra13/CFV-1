// Beta Account Ready Email
// Sent when a beta user finishes account creation.

import { Button, Link, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type BetaAccountReadyEmailProps = {
  name: string
  signInUrl: string
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export function BetaAccountReadyEmail({ name, signInUrl }: BetaAccountReadyEmailProps) {
  return (
    <BaseLayout preview="Your ChefFlow account is ready.">
      <Text style={heading}>Your account is live.</Text>
      <Text style={paragraph}>Hi {name},</Text>
      <Text style={paragraph}>
        You are officially in. Your ChefFlow account has been created and is ready for onboarding.
      </Text>

      <Button style={button} href={signInUrl}>
        Sign in and start onboarding
      </Button>

      <Text style={paragraph}>
        As a beta member, you get early access and direct feedback priority while we keep improving
        the product with you.
      </Text>

      <Text style={note}>
        If you did not create this account, please contact us at{' '}
        <Link href="mailto:info@cheflowhq.com" style={link}>
          info@cheflowhq.com
        </Link>
        .
      </Text>
      <Text style={note}>
        Learn more at{' '}
        <Link href={SITE_URL} style={link}>
          cheflowhq.com
        </Link>
        .
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
  marginBottom: '24px',
}

const note = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#6b7280',
  margin: '0 0 10px',
}

const link = {
  color: '#e88f47',
  textDecoration: 'none',
  fontWeight: '600' as const,
}
