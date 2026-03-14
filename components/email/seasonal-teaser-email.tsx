// Seasonal Menu Teaser Email
// Step 3 in the follow-up sequence (Day 90 after event).
// Re-engages dormant clients with seasonal inspiration.

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from '@/lib/email/templates/base-layout'

type SeasonalTeaserProps = {
  clientName: string
  chefName: string
  season: string
  bookingUrl: string
}

const SEASON_COPY: Record<string, { headline: string; teaser: string }> = {
  spring: {
    headline: 'Fresh spring flavors',
    teaser:
      'Spring produce is finally here. Think tender peas, ramps, asparagus, and strawberries at their peak. Perfect time for a lighter, brighter menu.',
  },
  summer: {
    headline: 'Summer is for gathering',
    teaser:
      'Long evenings, fresh tomatoes, stone fruit, and herbs straight from the garden. The best ingredients of the year deserve a table full of people you love.',
  },
  fall: {
    headline: 'Fall flavors are calling',
    teaser:
      'Squash, wild mushrooms, apples, and warm spices. Fall is comfort season, and there is nothing better than gathering around a table when the air turns crisp.',
  },
  winter: {
    headline: 'Cozy winter menus',
    teaser:
      'Root vegetables, braised meats, citrus, and rich sauces. Winter is for slowing down and sharing a meal that warms you from the inside out.',
  },
}

export function SeasonalTeaserEmail({
  clientName,
  chefName,
  season,
  bookingUrl,
}: SeasonalTeaserProps) {
  const copy = SEASON_COPY[season] || SEASON_COPY.fall

  return (
    <BaseLayout preview={`${chefName} has new ${season} menus to share`}>
      <Text style={heading}>{copy.headline}</Text>

      <Text style={paragraph}>Hi {clientName},</Text>

      <Text style={paragraph}>
        It has been a while since {chefName} last cooked for you, and we wanted to share what is
        inspiring us in the kitchen right now.
      </Text>

      <Text style={paragraph}>{copy.teaser}</Text>

      <Text style={paragraph}>
        If any of that sounds good, we would love to put together a custom menu for your next event.
        Just say the word.
      </Text>

      <Button style={primaryButton} href={bookingUrl}>
        Start Planning
      </Button>

      <Hr style={divider} />

      <Text style={muted}>
        Hope to see you at the table soon.
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
