// Circle Update Notification Email
// Short notification pointing the recipient to their Dinner Circle.
// Used by circleFirstNotify() when a lifecycle event is posted to the circle.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  recipientName: string
  chefName: string
  groupName: string
  updateLabel: string
  updatePreview: string
  circleUrl: string
}

export function CircleUpdateNotificationEmail({
  recipientName,
  chefName,
  groupName,
  updateLabel,
  updatePreview,
  circleUrl,
}: Props) {
  return (
    <BaseLayout preview={`${chefName} posted an update in ${groupName}`}>
      <Text style={heading}>New update in {groupName}</Text>
      <Text style={paragraph}>Hi {recipientName},</Text>
      <Text style={paragraph}>
        <strong>{chefName}</strong> posted a {updateLabel.toLowerCase()} update:
      </Text>

      <div style={updateBox}>
        <Text style={updateText}>{updatePreview}</Text>
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
        You&apos;re receiving this because you&apos;re a member of this circle. You can adjust
        notification settings from your circle.
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
const updateBox = {
  backgroundColor: '#f9fafb',
  borderLeft: '4px solid #78350f',
  padding: '16px 20px',
  borderRadius: '0 8px 8px 0',
  margin: '0 0 24px',
}
const updateText = { fontSize: '15px', color: '#374151', margin: '0' }
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
