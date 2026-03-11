import { Button, Link, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type BetaInviteEmailProps = {
  name: string
  inviteUrl: string
  brand?: ChefBrandProps
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export function BetaInviteEmail({ name, inviteUrl, brand }: BetaInviteEmailProps) {
  return (
    <BaseLayout
      brand={brand}
      preview="Your ChefFlow beta invite is ready. Create your account to get started."
    >
      <Text style={heading}>Your beta invite is ready.</Text>
      <Text style={paragraph}>Hi {name},</Text>
      <Text style={paragraph}>
        A spot has opened for you in the ChefFlow beta. Use the link below to create your account
        and start onboarding.
      </Text>

      <Button style={button} href={inviteUrl}>
        Create my beta account
      </Button>

      <Text style={paragraph}>
        This link pre-fills your email so you can get moving quickly. Once your account is created,
        you&apos;ll land in onboarding and can start setting up your workflow right away.
      </Text>

      <Text style={note}>
        If the button doesn&apos;t work, copy and paste this link into your browser:{' '}
        <Link href={inviteUrl} style={link}>
          {inviteUrl}
        </Link>
      </Text>
      <Text style={note}>
        Need context first? Learn more at{' '}
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
