// Waitlist Match Email - Sent when a chef joins an area that had zero results
// Part of the directory waitlist re-engagement system (Q12 fix)

import { Button, Link, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type WaitlistMatchEmailProps = {
  location: string
  chefNames: string
  matchCount: number
  browseUrl: string
}

export function WaitlistMatchEmail({
  location,
  chefNames,
  matchCount,
  browseUrl,
}: WaitlistMatchEmailProps) {
  const chefLabel = matchCount === 1 ? 'a chef' : `${matchCount} chefs`

  return (
    <BaseLayout preview={`${chefLabel} now available near ${location}`}>
      <Text style={{ fontSize: '18px', fontWeight: 600, color: '#1c1917', marginBottom: '8px' }}>
        Good news!
      </Text>
      <Text style={{ fontSize: '15px', color: '#44403c', lineHeight: '1.6' }}>
        You signed up to be notified when a private chef became available near{' '}
        <strong>{location}</strong>. We now have {chefLabel} in your area: {chefNames}
        {matchCount > 3 ? ` and ${matchCount - 3} more` : ''}.
      </Text>
      <Button
        href={browseUrl}
        style={{
          backgroundColor: '#e88f47',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '15px',
          textDecoration: 'none',
          display: 'inline-block',
          marginTop: '16px',
          marginBottom: '16px',
        }}
      >
        Browse Chefs Near {location}
      </Button>
      <Text style={{ fontSize: '13px', color: '#78716c', lineHeight: '1.5' }}>
        You are receiving this because you signed up for our chef availability waitlist. You will
        not receive this notification again for this location.
      </Text>
    </BaseLayout>
  )
}
