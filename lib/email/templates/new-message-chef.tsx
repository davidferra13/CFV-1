// New Message — Chef Notification Email
// Sent to the chef when a client sends a chat message.
// Rate-limited at call site: max one per thread per hour to avoid inbox spam.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  chefName: string
  clientName: string
  messagePreview: string // First ~120 chars of the message
  conversationUrl: string
}

export function NewMessageChefEmail({
  chefName,
  clientName,
  messagePreview,
  conversationUrl,
}: Props) {
  return (
    <BaseLayout preview={`New message from ${clientName}`}>
      <Text style={heading}>New message from {clientName}</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        <strong>{clientName}</strong> sent you a message:
      </Text>

      <div style={quoteBox}>
        <Text style={quoteText}>&quot;{messagePreview}&quot;</Text>
      </div>

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={conversationUrl}
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
          Reply in ChefFlow
        </Link>
      </div>

      <Text style={muted}>
        You&apos;re receiving this because a client messaged you on ChefFlow. Manage notification
        preferences in your settings.
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
