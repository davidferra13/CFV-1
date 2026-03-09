import { Button, Link, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type ClientAccountDeletionCancelledEmailProps = {
  name: string
  manageUrl: string
}

export function ClientAccountDeletionCancelledEmail({
  name,
  manageUrl,
}: ClientAccountDeletionCancelledEmailProps) {
  return (
    <BaseLayout preview="Your ChefFlow account deletion request has been cancelled.">
      <Text style={heading}>Your account is staying active.</Text>
      <Text style={paragraph}>Hi {name},</Text>
      <Text style={paragraph}>
        Your pending ChefFlow account deletion request has been cancelled. Your client account and
        saved preferences will remain active.
      </Text>
      <Button style={button} href={manageUrl}>
        View My Profile
      </Button>
      <Text style={note}>
        If you still want to leave later, you can submit a new deletion request from your profile.
      </Text>
      <Text style={note}>
        Need help? Contact{' '}
        <Link href="mailto:info@cheflowhq.com" style={link}>
          info@cheflowhq.com
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
