import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  guestName: string
  chefName: string
  occasion: string
  eventDate: string
  intakeUrl: string
}

export function CannabisGuestOnboardingEmail({
  guestName,
  chefName,
  occasion,
  eventDate,
  intakeUrl,
}: Props) {
  const greeting = guestName || 'there'

  return (
    <BaseLayout preview={`You're invited to ${occasion} with ${chefName}`}>
      <Text style={heading}>Cannabis Dining Experience</Text>

      <Text style={paragraph}>Hi {greeting},</Text>

      <Text style={paragraph}>
        You have been invited to a cannabis-friendly dining experience hosted by{' '}
        <strong>{chefName}</strong>:
      </Text>

      <Text style={detailBlock}>
        <strong>{occasion}</strong>
        <br />
        {eventDate}
      </Text>

      <Text style={paragraph}>
        Before the event, we need a few details from you. This short intake covers your comfort
        level with cannabis, any dietary needs, and a quick age confirmation for participating
        guests. It takes about 2 minutes.
      </Text>

      <Button style={primaryButton} href={intakeUrl}>
        Complete Your Intake
      </Button>

      <Hr style={divider} />

      <Text style={muted}>
        Cannabis participation is entirely optional. You can attend the dinner and opt out of any
        cannabis-infused courses.
      </Text>
      <Text style={muted}>
        This link is unique to you and should not be shared. If you have questions, reply to this
        email to reach your host.
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

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
}

const detailBlock = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#18181b',
  backgroundColor: '#f9fafb',
  padding: '12px 16px',
  borderRadius: '6px',
  margin: '0 0 16px',
}

const primaryButton = {
  backgroundColor: '#2e7d32',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block' as const,
  marginBottom: '24px',
}

const divider = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '24px 0',
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0 0 8px',
}
