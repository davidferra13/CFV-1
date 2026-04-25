// Post-Event Thank You Email
// Sent 3 days after event completion via Inngest background job.
// Warm, personal tone - reinforces the experience and invites rebooking.

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type PostEventThankYouProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  bookAgainUrl: string
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null
  loyaltyPointsEarned?: number | null
  loyaltyPointsBalance?: number | null
  circleJoinUrl?: string | null
  circleGroupName?: string | null
}

export function PostEventThankYouEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  bookAgainUrl,
  loyaltyTier,
  loyaltyPointsEarned,
  loyaltyPointsBalance,
  circleJoinUrl,
  circleGroupName,
}: PostEventThankYouProps) {
  return (
    <BaseLayout preview={`${chefName} wanted to say thank you`}>
      <Text style={heading}>A personal thank you</Text>

      <Text style={paragraph}>Hi {clientName},</Text>

      <Text style={paragraph}>
        It has been a few days since your <strong>{occasion}</strong> on {eventDate}, and{' '}
        <strong>{chefName}</strong> wanted to personally thank you for the opportunity to be part of
        your celebration.
      </Text>

      <Text style={paragraph}>
        Creating memorable dining experiences is what drives us, and having guests like you makes it
        all worthwhile. We truly hope every dish exceeded your expectations.
      </Text>

      {(typeof loyaltyPointsEarned === 'number' && loyaltyPointsEarned > 0) ||
      loyaltyTier ||
      typeof loyaltyPointsBalance === 'number' ? (
        <Text style={paragraph}>
          Loyalty update:{' '}
          {typeof loyaltyPointsEarned === 'number' && loyaltyPointsEarned > 0
            ? `you earned ${loyaltyPointsEarned} points from this event`
            : 'your loyalty profile is active'}
          {typeof loyaltyPointsBalance === 'number'
            ? ` and now have ${loyaltyPointsBalance.toLocaleString()} total points`
            : ''}
          {loyaltyTier ? ` (${loyaltyTier} tier).` : '.'}
        </Text>
      ) : null}

      {circleJoinUrl ? (
        <>
          <Hr style={divider} />
          <Text style={heading}>Stay connected</Text>
          <Text style={paragraph}>
            {chefName} hosts dinners regularly through a Dinner Circle
            {circleGroupName ? ` called "${circleGroupName}"` : ''}. Join to get first access to
            upcoming events, menus, and availability.
          </Text>
          <Button
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
            href={circleJoinUrl}
          >
            Join the Dinner Circle
          </Button>
        </>
      ) : null}

      <Hr style={divider} />

      <Text style={paragraph}>
        Whenever you are ready for another exceptional dining experience, we would love to cook for
        you again.
      </Text>

      <Button style={primaryButton} href={bookAgainUrl}>
        Book Another Experience
      </Button>

      <Text style={muted}>
        With gratitude,
        <br />
        {chefName} via ChefFlow
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

const primaryButton = {
  backgroundColor: '#18181b',
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
  margin: '0',
  lineHeight: '1.5',
}
