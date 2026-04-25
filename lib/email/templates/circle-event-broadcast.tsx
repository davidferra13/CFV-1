// Circle Event Broadcast Email
// Sent to circle members when a chef publishes a new ticketed event.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  recipientName: string
  chefName: string
  groupName: string
  eventName: string
  eventDate: string
  eventLocation: string
  priceRange: string
  spotsAvailable: string
  ticketUrl: string
  circleUrl: string
}

export function CircleEventBroadcastEmail({
  recipientName,
  chefName,
  groupName,
  eventName,
  eventDate,
  eventLocation,
  priceRange,
  spotsAvailable,
  ticketUrl,
  circleUrl,
}: Props) {
  return (
    <BaseLayout preview={`${chefName} posted a new dinner in ${groupName}`}>
      <Text style={heading}>New dinner from {chefName}</Text>
      <Text style={paragraph}>Hi {recipientName},</Text>
      <Text style={paragraph}>
        {chefName} just posted a new dinner in {groupName}:
      </Text>

      <div style={detailBox}>
        <Text style={detailTitle}>{eventName}</Text>
        <Text style={detailLine}>{eventDate}</Text>
        <Text style={detailLine}>{eventLocation}</Text>
        <Text style={detailLine}>{priceRange}</Text>
        <Text style={detailLine}>{spotsAvailable}</Text>
      </div>

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={ticketUrl}
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
          Get Tickets
        </Link>
      </div>

      <div style={{ textAlign: 'center', margin: '0 0 24px' }}>
        <Link href={circleUrl} style={secondaryLink}>
          View Circle
        </Link>
      </div>

      <Text style={muted}>
        You&apos;re receiving this because you&apos;re a member of {groupName}. You can mute
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
const detailBox = {
  backgroundColor: '#f9fafb',
  borderLeft: '4px solid #78350f',
  padding: '16px 20px',
  borderRadius: '0 8px 8px 0',
  margin: '0 0 24px',
}
const detailTitle = {
  fontSize: '16px',
  fontWeight: '600' as const,
  color: '#18181b',
  margin: '0 0 8px',
}
const detailLine = { fontSize: '14px', color: '#374151', margin: '0 0 4px' }
const secondaryLink = { fontSize: '14px', color: '#78350f', textDecoration: 'underline' }
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
