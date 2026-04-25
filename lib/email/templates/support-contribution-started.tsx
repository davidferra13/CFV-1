import { Heading, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type SupportContributionStartedEmailProps = {
  chefName?: string | null
  contributionLabel: string
}

export function SupportContributionStartedEmail({
  chefName,
  contributionLabel,
}: SupportContributionStartedEmailProps) {
  const greeting = chefName ? `Hi ${chefName},` : 'Hi,'

  return (
    <BaseLayout preview="Thank you for supporting ChefFlow">
      <Heading style={h1}>Thank you for supporting ChefFlow</Heading>
      <Text style={bodyText}>{greeting}</Text>
      <Text style={bodyText}>
        Thank you for contributing {contributionLabel}. Your support helps keep ChefFlow moving
        while every core feature remains available to chefs.
      </Text>
      <Text style={bodyText}>You can change or end monthly support anytime from Settings.</Text>
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
