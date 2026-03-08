// Circle Message Notification Email
// Sent to circle members when a new message is posted.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type Props = {
  recipientName: string
  senderName: string
  groupName: string
  messagePreview: string
  circleUrl: string
}

export function CircleMessageEmail({
  recipientName,
  senderName,
  groupName,
  messagePreview,
  circleUrl,
}: Props) {
  return (
    <BaseLayout brand={brand} preview={`${senderName} posted in ${groupName}`}>
      <Text style={heading}>New message in {groupName}</Text>
      <Text style={paragraph}>Hi {recipientName},</Text>
      <Text style={paragraph}>
        <strong>{senderName}</strong> posted a message:
      </Text>

      <div style={quoteBox}>
        <Text style={quoteText}>&quot;{messagePreview}&quot;</Text>
      </div>

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={circleUrl}
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
          View in Circle
        </Link>
      </div>

      <Text style={muted}>
        You&apos;re receiving this because you&apos;re a member of this Dinner Circle. You can mute
        notifications from the circle settings.
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
const quoteBox = {
  backgroundColor: '#f9fafb',
  borderLeft: '4px solid #78350f',
  padding: '16px 20px',
  borderRadius: '0 8px 8px 0',
  margin: '0 0 24px',
}
const quoteText = { fontSize: '15px', color: '#374151', margin: '0', fontStyle: 'italic' as const }
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
