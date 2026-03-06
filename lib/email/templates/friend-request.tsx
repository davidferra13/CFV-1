// Friend Request Notification Email
// Sent when someone sends a friend request in the Hub.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  recipientName: string
  senderName: string
  hubUrl: string
}

export function FriendRequestEmail({ recipientName, senderName, hubUrl }: Props) {
  return (
    <BaseLayout preview={`${senderName} wants to connect`}>
      <Text style={heading}>New connection request</Text>
      <Text style={paragraph}>Hi {recipientName},</Text>
      <Text style={paragraph}>
        <strong>{senderName}</strong> would like to connect with you on ChefFlow.
      </Text>

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={hubUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#78350f',
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          View Request
        </Link>
      </div>

      <Text style={muted}>
        You&apos;re receiving this because someone sent you a friend request on ChefFlow.
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
