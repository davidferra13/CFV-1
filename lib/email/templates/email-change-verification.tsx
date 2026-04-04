// Email Change Verification
// Sent when a user requests to change their account email address.

import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  confirmUrl: string
}

export function EmailChangeVerificationEmail({ confirmUrl }: Props) {
  return (
    <BaseLayout preview="Confirm your new ChefFlow email address">
      <Heading style={h1}>Confirm your new email</Heading>
      <Text style={bodyText}>
        You requested to change your ChefFlow account email to this address. Click the button below
        to confirm.
      </Text>
      <Section style={{ textAlign: 'center', marginTop: '28px' }}>
        <Button href={confirmUrl} style={btn}>
          Confirm Email Change
        </Button>
      </Section>
      <Text style={footerText}>
        This link expires in 1 hour. If you did not request this change, you can safely ignore this
        email and your account will remain unchanged.
      </Text>
    </BaseLayout>
  )
}

const h1 = {
  color: '#111827',
  fontSize: '22px',
  fontWeight: '700' as const,
  lineHeight: '1.3',
  margin: '0 0 16px',
}

const bodyText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const footerText = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '24px 0 0',
}

const btn = {
  backgroundColor: '#c2410c',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '12px 28px',
  textDecoration: 'none',
}
