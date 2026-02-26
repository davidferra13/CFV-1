// Client Invitation Email
// Sent when a chef invites a client to join CheFlow

import { Button, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type ClientInvitationProps = {
  clientName: string
  chefName: string
  invitationUrl: string
  expiresInDays: number
}

export function ClientInvitationEmail({
  clientName,
  chefName,
  invitationUrl,
  expiresInDays,
}: ClientInvitationProps) {
  return (
    <BaseLayout preview={`${chefName} invited you to CheFlow`}>
      <Text style={heading}>You&apos;re invited!</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        <strong>{chefName}</strong> has invited you to join CheFlow — where you can view event
        details, review quotes, make payments, and communicate directly with your chef.
      </Text>
      <Button style={button} href={invitationUrl}>
        Accept Invitation
      </Button>
      <Text style={muted}>
        This invitation expires in {expiresInDays} days. If you didn&apos;t expect this, you can
        safely ignore this email.
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

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
