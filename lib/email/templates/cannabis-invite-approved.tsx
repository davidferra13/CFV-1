// Cannabis Invite Approved - Sent to invitee when admin approves their invitation
// Contains a claim link with time-limited token

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  inviteeName: string | null
  inviterName: string | null
  claimUrl: string
  expiresInDays: number
}

export function CannabisInviteApprovedEmail({
  inviteeName,
  inviterName,
  claimUrl,
  expiresInDays,
}: Props) {
  const greeting = inviteeName ? `Hi ${inviteeName}` : 'Hi there'

  return (
    <BaseLayout preview="Your cannabis dining invitation has been approved">
      <Text style={heading}>Your Invitation Has Been Approved</Text>
      <Text style={paragraph}>{greeting},</Text>
      <Text style={paragraph}>
        {inviterName
          ? `Your cannabis dining invitation from ${inviterName} has been reviewed and approved.`
          : 'Your cannabis dining invitation has been reviewed and approved.'}{' '}
        You can now claim your access to the cannabis dining portal.
      </Text>

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={claimUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#2e7d32',
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          Claim Your Access
        </Link>
      </div>

      <Text style={muted}>
        This link expires in {expiresInDays} days. If it expires before you claim it, contact the
        person who invited you to request a new link.
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
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 16px' }
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
