import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type FrontOfHouseMenuReadyEmailProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
}

export function FrontOfHouseMenuReadyEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
}: FrontOfHouseMenuReadyEmailProps) {
  return (
    <BaseLayout preview={`Your guest menu is ready for ${occasion}`}>
      <Text style={heading}>Your guest menu is ready</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Your printable guest menu for <strong>{occasion}</strong> ({eventDate}) is attached as a
        PDF.
      </Text>
      <Text style={paragraph}>Print it and place it on the table for your guests to enjoy.</Text>
      <Text style={muted}>
        If any dish wording should be adjusted before service, reply to this email.
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

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
