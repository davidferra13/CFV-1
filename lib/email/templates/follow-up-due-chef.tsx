// Follow-Up Due — Chef Notification Email
// Sent to the chef when a scheduled follow-up on an inquiry becomes overdue.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  chefName: string
  clientName: string
  occasion: string | null
  followUpNote: string | null   // The reminder note the chef set
  daysOverdue: number
  clientUrl: string
}

export function FollowUpDueChefEmail({
  chefName,
  clientName,
  occasion,
  followUpNote,
  daysOverdue,
  clientUrl,
}: Props) {
  const overdueLabel = daysOverdue === 0 ? 'today' : daysOverdue === 1 ? 'yesterday' : `${daysOverdue} days ago`
  const eventLabel = occasion || 'their event'

  return (
    <BaseLayout preview={`Follow-up due: ${clientName}`}>
      <Text style={heading}>Follow-up due</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        A follow-up with <strong>{clientName}</strong> regarding{' '}
        <em>{eventLabel}</em> was due {overdueLabel}.
      </Text>

      {followUpNote && (
        <div style={noteBox}>
          <Text style={noteLabel}>Your reminder note</Text>
          <Text style={noteText}>{followUpNote}</Text>
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
          Open Inquiry
        </Link>
      </div>

      <Text style={muted}>
        Manage follow-up preferences and intervals in Settings → Preferences.
      </Text>
    </BaseLayout>
  )
}

const heading = { fontSize: '24px', fontWeight: '600' as const, color: '#18181b', margin: '0 0 16px' }
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 16px' }
const noteBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fef08a',
  borderRadius: '8px',
  padding: '16px',
  margin: '0 0 24px',
}
const noteLabel = { fontSize: '12px', fontWeight: '600' as const, color: '#92400e', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 6px' }
const noteText = { fontSize: '15px', color: '#374151', margin: '0' }
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
