// Circle Digest Email
// Batched notification showing multiple messages since last digest.
// Sent hourly or daily depending on member's digest_mode preference.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type DigestMessage = {
  authorName: string
  body: string
  timestamp: string
}

type Props = {
  recipientName: string
  groupName: string
  messages: DigestMessage[]
  circleUrl: string
}

export function CircleDigestEmail({ recipientName, groupName, messages, circleUrl }: Props) {
  const count = messages.length
  const noun = count === 1 ? 'message' : 'messages'

  return (
    <BaseLayout preview={`${count} new ${noun} in ${groupName}`}>
      <Text style={heading}>
        {count} new {noun} in {groupName}
      </Text>
      <Text style={paragraph}>Hi {recipientName},</Text>
      <Text style={paragraph}>Here&apos;s what you missed in your Dinner Circle:</Text>

      <div style={messageList}>
        {messages.slice(0, 10).map((msg, i) => (
          <div key={i} style={messageRow}>
            <div style={messageHeader}>
              <strong style={{ color: '#18181b' }}>{msg.authorName}</strong>
              <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '8px' }}>
                {msg.timestamp}
              </span>
            </div>
            <Text style={messageBody}>{msg.body.slice(0, 150)}</Text>
          </div>
        ))}
        {count > 10 && (
          <Text style={{ ...paragraph, fontStyle: 'italic', color: '#9ca3af' }}>
            ...and {count - 10} more
          </Text>
        )}
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
          Open Dinner Circle
        </Link>
      </div>

      <Text style={muted}>
        You&apos;re receiving this digest because of your notification settings. You can switch to
        instant notifications or mute this circle from the circle settings.
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
const messageList = {
  borderLeft: '4px solid #78350f',
  paddingLeft: '16px',
  margin: '0 0 24px',
}
const messageRow = {
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
}
const messageHeader = {
  fontSize: '14px',
  marginBottom: '4px',
}
const messageBody = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
  lineHeight: '1.4',
}
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
