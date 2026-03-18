// Client Visit Alert - Real-time notification email
// Sent to the chef when a client visits the portal (debounced per 30-min session).

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  chefName: string
  clientName: string
  eventType: string
  clientUrl: string
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  portal_login: 'just logged into the client portal',
  payment_page_visited: 'is viewing the payment page',
  proposal_viewed: 'is reviewing a proposal',
  quote_viewed: 'is looking at a quote',
}

export function ClientVisitAlertEmail({ chefName, clientName, eventType, clientUrl }: Props) {
  const actionLabel = EVENT_TYPE_LABELS[eventType] || 'is active on your site'
  const isHighIntent = ['payment_page_visited', 'proposal_viewed', 'quote_viewed'].includes(
    eventType
  )

  return (
    <BaseLayout preview={`${clientName} is on your site`}>
      <Text style={heading}>
        {isHighIntent ? '🔥 ' : ''}
        {clientName} {actionLabel}
      </Text>

      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        <strong>{clientName}</strong> {actionLabel}. Now might be a good time to reach out while
        they&apos;re engaged.
      </Text>

      {isHighIntent && (
        <div style={intentBox}>
          <Text style={intentLabel}>High-intent signal</Text>
          <Text style={intentText}>
            This client is actively looking at{' '}
            {eventType === 'payment_page_visited' ? 'payment options' : 'your proposal'}. A quick
            follow-up could close the deal.
          </Text>
        </div>
      )}

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={clientUrl}
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
          View Client
        </Link>
      </div>

      <Text style={muted}>
        You&apos;re receiving this because visitor alerts are enabled. Manage in Settings →
        Notifications.
      </Text>
    </BaseLayout>
  )
}

const heading = {
  fontSize: '22px',
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
const intentBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '16px',
  margin: '0 0 24px',
}
const intentLabel = {
  fontSize: '12px',
  fontWeight: '600' as const,
  color: '#991b1b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 6px',
}
const intentText = { fontSize: '15px', color: '#374151', margin: '0' }
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
