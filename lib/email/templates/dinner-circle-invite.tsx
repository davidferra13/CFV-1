// Dinner Circle Invitation Email
// Appended to the chef's first response email to a new inquiry.
// Invites the client to join their Dinner Circle with zero account creation.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  recipientName: string
  chefName: string
  circleUrl: string
  groupName?: string
}

export function DinnerCircleInviteEmail({ recipientName, chefName, circleUrl, groupName }: Props) {
  const title = groupName || 'Your Dinner Circle'

  return (
    <BaseLayout preview={`${chefName} set up a page for your dinner`}>
      <Text style={heading}>{title} is ready</Text>
      <Text style={paragraph}>Hi {recipientName},</Text>

      <Text style={paragraph}>
        {chefName} set up a dedicated page for your dinner where you can see the menu, share details
        with anyone joining, and keep everything in one place. No account needed.
      </Text>

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
          View Your Dinner Circle
        </Link>
      </div>

      <Text style={paragraph}>Here you can:</Text>
      <ul style={listStyle}>
        <li style={listItem}>See confirmed details and what is still needed</li>
        <li style={listItem}>View the menu when it is ready</li>
        <li style={listItem}>Share dietary info and allergies</li>
        <li style={listItem}>Message {chefName} directly</li>
      </ul>

      <Text style={muted}>
        If you prefer email, that works too. This page is just a convenient way to keep everything
        in one place.
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
const listStyle = {
  fontSize: '15px',
  lineHeight: '1.8',
  color: '#374151',
  margin: '0 0 16px',
  paddingLeft: '20px',
}
const listItem = { margin: '0 0 4px' }
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
