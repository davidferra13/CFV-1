// Beta Welcome Email
// Sent immediately when someone signs up at /beta
// Confirms their spot and sets expectations

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type BetaWelcomeProps = {
  name: string
  brand?: ChefBrandProps
}

export function BetaWelcomeEmail({ name }: BetaWelcomeProps) {
  return (
    <BaseLayout brand={brand} preview="You're on the list — welcome to the ChefFlow beta.">
      <Text style={heading}>You&apos;re on the list.</Text>
      <Text style={paragraph}>Hi {name},</Text>
      <Text style={paragraph}>
        Thank you for signing up for the ChefFlow closed beta. Your spot is reserved, and we&apos;ll
        be in touch when your access is ready.
      </Text>
      <Text style={paragraph}>Here&apos;s what happens next:</Text>
      <table style={stepsTable}>
        <tbody>
          <tr>
            <td style={stepNumber}>1</td>
            <td style={stepText}>
              <strong>We review your signup</strong> — we&apos;re onboarding chefs in small batches
              to keep things personal.
            </td>
          </tr>
          <tr>
            <td style={stepNumber}>2</td>
            <td style={stepText}>
              <strong>You get an invitation email</strong> — with a personal link to create your
              account and start using the full platform.
            </td>
          </tr>
          <tr>
            <td style={stepNumber}>3</td>
            <td style={stepText}>
              <strong>You help shape ChefFlow</strong> — beta testers get priority support and a
              direct line to the team building this.
            </td>
          </tr>
        </tbody>
      </table>
      <Text style={note}>
        The beta is free. When we launch publicly, beta testers get special pricing as a thank you
        for being early.
      </Text>
      <Text style={note}>
        In the meantime, you can learn more at{' '}
        <Link href={SITE_URL} style={link}>
          cheflowhq.com
        </Link>
        .
      </Text>
      <Text style={signoff}>— The ChefFlow Team</Text>
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

const stepsTable = {
  width: '100%',
  marginBottom: '24px',
}

const stepNumber = {
  fontSize: '14px',
  fontWeight: '700' as const,
  color: '#e88f47',
  padding: '10px 12px 10px 0',
  verticalAlign: 'top' as const,
  width: '24px',
}

const stepText = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#374151',
  padding: '10px 0',
  borderBottom: '1px solid #f3f4f6',
}

const note = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#6b7280',
  margin: '0 0 12px',
}

const link = {
  color: '#e88f47',
  textDecoration: 'none',
  fontWeight: '600' as const,
}

const signoff = {
  fontSize: '14px',
  color: '#374151',
  fontWeight: '500' as const,
  margin: '24px 0 0',
}
