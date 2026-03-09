import { Button, Link, Text } from '@react-email/components'
import * as React from 'react'
import { format } from 'date-fns'
import { BaseLayout } from './base-layout'

type ClientAccountDeletionRequestedEmailProps = {
  name: string
  scheduledFor: string
  manageUrl: string
}

export function ClientAccountDeletionRequestedEmail({
  name,
  scheduledFor,
  manageUrl,
}: ClientAccountDeletionRequestedEmailProps) {
  return (
    <BaseLayout preview="Your ChefFlow account deletion request has been scheduled.">
      <Text style={heading}>Your deletion request is scheduled.</Text>
      <Text style={paragraph}>Hi {name},</Text>
      <Text style={paragraph}>
        We received your request to delete your ChefFlow client account. Your account is scheduled
        for deletion on {format(new Date(scheduledFor), 'MMMM d, yyyy')}.
      </Text>
      <Text style={paragraph}>
        You still have access during the 30-day grace period. You can export your data or cancel the
        request from your profile at any time before the scheduled date.
      </Text>
      <Button style={button} href={manageUrl}>
        Manage My Account
      </Button>
      <Text style={note}>
        If you did not request this change, open your profile immediately and cancel the deletion.
      </Text>
      <Text style={note}>
        Need help? Reply to your chef directly or contact{' '}
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
