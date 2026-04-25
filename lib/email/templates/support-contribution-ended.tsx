import { Heading, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type SupportContributionEndedEmailProps = {
  chefName?: string | null
}

export function SupportContributionEndedEmail({ chefName }: SupportContributionEndedEmailProps) {
  const greeting = chefName ? `Hi ${chefName},` : 'Hi,'

  return (
    <BaseLayout preview="Your ChefFlow support has ended">
      <Heading style={h1}>Your ChefFlow support has ended</Heading>
      <Text style={bodyText}>{greeting}</Text>
      <Text style={bodyText}>
        Your monthly support has ended. Thank you for the time you contributed to ChefFlow's
        development.
      </Text>
      <Text style={bodyText}>ChefFlow remains fully available for your business.</Text>
    </BaseLayout>
  )
}

const h1 = {
  color: '#111827',
  fontSize: '22px',
  fontWeight: '700' as const,
  lineHeight: '1.3',
  margin: '0 0 16px',
}

const bodyText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
