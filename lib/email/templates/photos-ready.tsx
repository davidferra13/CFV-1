// Photos Ready Email
// Sent to client when the chef uploads the first photo from their event

import { Text, Button } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type PhotosReadyProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  photoCount: number
  eventId: string
  appUrl: string
}

export function PhotosReadyEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  photoCount,
  eventId,
  appUrl,
}: PhotosReadyProps) {
  const photoLabel = photoCount === 1 ? '1 photo' : `${photoCount} photos`

  return (
    <BaseLayout preview={`Your ${occasion} photos are ready to view`}>
      <Text style={heading}>Your event photos are ready!</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        <strong>{chefName}</strong> has uploaded {photoLabel} from your <strong>{occasion}</strong>{' '}
        on {eventDate}. Head to your portal to view and download them.
      </Text>

      <Button href={`${appUrl}/my-events/${eventId}`} style={ctaButton}>
        View Your Photos →
      </Button>

      <Text style={muted}>Photos are available in your event portal for download at any time.</Text>
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

const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#18181b',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  margin: '4px 0 20px',
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
