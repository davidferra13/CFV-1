import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type PrepSheetReadyEmailProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  brand?: ChefBrandProps
}

export function PrepSheetReadyEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  brand,
}: PrepSheetReadyEmailProps) {
  return (
    <BaseLayout brand={brand} preview={`Prep sheet attached for ${occasion}`}>
      <Text style={heading}>Your prep sheet is attached</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        Your prep sheet for <strong>{occasion}</strong> ({eventDate}) is attached as a PDF.
      </Text>
      <Text style={paragraph}>
        Print it and tape it to your counter. It&apos;s organized into what you can start right now
        (PREP NOW) vs. what needs to wait until after shopping (PREP AFTER SHOPPING).
      </Text>
      <Text style={muted}>
        When all AT HOME tasks are done, you&apos;ll arrive at {clientName}&apos;s with only
        execution work remaining — 80% calm before you walk in the door.
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
