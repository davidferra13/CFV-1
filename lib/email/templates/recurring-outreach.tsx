// Recurring Outreach Email Template
// Personalized re-engagement email for at-risk and dormant clients.
// Includes past event reference, seasonal hook, and booking CTA.
// No em dashes.

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type RecurringOutreachEmailProps = {
  clientName: string
  chefName: string
  /** Personalized outreach body text (from deterministic template generator) */
  bodyText: string
  /** Link to book again */
  bookingUrl: string
  brand?: ChefBrandProps
}

export function RecurringOutreachEmail({
  clientName,
  chefName,
  bodyText,
  bookingUrl,
  brand,
}: RecurringOutreachEmailProps) {
  // Split body text into paragraphs at double newlines
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <BaseLayout brand={brand} preview={`${chefName} would love to cook for you again`}>
      <Text style={heading}>We miss cooking for you</Text>

      {paragraphs.map((para, i) => (
        <Text key={i} style={paragraph}>
          {para}
        </Text>
      ))}

      <Button style={primaryButton} href={bookingUrl}>
        Book Your Next Experience
      </Button>

      <Hr style={divider} />

      <Text style={paragraph}>
        If now is not the right time, no worries at all. We will be here whenever you are ready.
      </Text>

      <Text style={muted}>
        Warmly,
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
