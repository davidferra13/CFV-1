// Password Reset Email
// Sent when a user requests a password reset via the forgot password page.

import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type PasswordResetEmailProps = {
  resetUrl: string
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <BaseLayout preview="Reset your ChefFlow password">
      <Heading style={h1}>Reset your password</Heading>
      <Text style={bodyText}>
        We received a request to reset your ChefFlow password. Click the button below to choose a
        new password.
      </Text>
      <Section style={{ textAlign: 'center', marginTop: '28px' }}>
        <Button href={resetUrl} style={btn}>
          Reset Password
        </Button>
      </Section>
      <Text style={footerText}>
        This link expires in 1 hour. If you did not request a password reset, you can safely ignore
        this email.
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
