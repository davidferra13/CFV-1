// Seasonal Rebook Prompt Email
// Sent 60 days before the anniversary of a completed 4+ star event.
// Provides one-click "Book Again" and "Not this year" options.

import { Text, Button, Section } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type SeasonalRebookPromptProps = {
  clientName: string
  chefName: string
  occasion: string
  originalDate: string
  rebookUrl: string
  suppressUrl: string
}

export function SeasonalRebookPromptEmail({
  clientName,
  chefName,
  occasion,
  originalDate,
  rebookUrl,
  suppressUrl,
}: SeasonalRebookPromptProps) {
  return (
    <BaseLayout preview={`Your ${occasion} with ${chefName} was a year ago`}>
      <Text style={heading}>Time flies</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Your {occasion} dinner with {chefName} was about a year ago ({originalDate}). Planning this
        year&apos;s celebration?
      </Text>

      <Section style={buttonSection}>
        <Button href={rebookUrl} style={primaryButton}>
          Yes, book again
        </Button>
      </Section>

      <Text style={paragraph}>
        If this year is not the year, no worries. We will not bother you again until next time.
      </Text>

      <Section style={buttonSection}>
        <Button href={suppressUrl} style={secondaryButton}>
          Not this year
        </Button>
      </Section>

      <Text style={footer}>
        This message was sent because you had a great experience and we thought you might want to do
        it again. You will only receive this once per year at most.
      </Text>
    </BaseLayout>
  )
}

const heading: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 600,
  color: '#1c1917',
  marginBottom: '16px',
}

const paragraph: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#44403c',
  marginBottom: '12px',
}

const buttonSection: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const primaryButton: React.CSSProperties = {
  backgroundColor: '#d97706',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
}

const secondaryButton: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: '#78716c',
  padding: '10px 20px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  textDecoration: 'underline',
  border: 'none',
}

const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#a8a29e',
  marginTop: '32px',
  borderTop: '1px solid #e7e5e4',
  paddingTop: '16px',
}
