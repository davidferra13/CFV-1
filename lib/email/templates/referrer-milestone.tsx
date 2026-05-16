// Referrer Milestone Notification Email
// Lightweight, privacy-respecting update to referrers at key lifecycle events.
// No links to client portal or event details. "Thanks for spreading the word" tone.

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  recipientName: string
  heading: string
  body: string
  chefName: string
}

export function ReferrerMilestoneEmail({ recipientName, heading, body, chefName }: Props) {
  return (
    <BaseLayout preview={heading}>
      <Text style={headingStyle}>{heading}</Text>
      <Text style={paragraph}>Hi {recipientName},</Text>
      <Text style={paragraph}>{body}</Text>
      <Text style={paragraph}>
        Thanks for spreading the word about {chefName}. Great food deserves great company.
      </Text>
      <Text style={footer}>
        You received this because someone used your referral link. If you no longer want these
        updates, let the person you referred know they can opt out on your behalf in their account
        settings.
      </Text>
    </BaseLayout>
  )
}

const headingStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#1c1917',
  marginBottom: '16px',
}

const paragraph: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#44403c',
  marginBottom: '12px',
}

const footer: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#a8a29e',
  marginTop: '24px',
  borderTop: '1px solid #e7e5e4',
  paddingTop: '16px',
}
