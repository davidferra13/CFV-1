// Event Completed Email
// Sent to client when chef marks event as completed.
// Two CTAs: view receipt (primary) and leave a review (secondary).

import { Button, Hr, Img, Text } from '@react-email/components'
import * as React from 'react'
import { getQrCodeUrl } from '@/lib/qr/qr-code'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type EventCompletedProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  receiptUrl: string
  reviewUrl: string
  rebookUrl?: string | null
  brand?: ChefBrandProps
}

export function EventCompletedEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  receiptUrl,
  reviewUrl,
  rebookUrl,
  brand,
}: EventCompletedProps) {
  const rebookQrUrl = rebookUrl ? getQrCodeUrl(rebookUrl, 220) : null

  return (
    <BaseLayout brand={brand} preview={`Thank you for dining with ${chefName}`}>
      <Text style={heading}>Thank you for a wonderful evening!</Text>

      <Text style={paragraph}>Hi {clientName},</Text>

      <Text style={paragraph}>
        Your <strong>{occasion}</strong> on {eventDate} with <strong>{chefName}</strong> is
        complete. We hope it was an experience worth remembering.
      </Text>

      <Button style={primaryButton} href={receiptUrl}>
        View Your Receipt
      </Button>

      <Hr style={divider} />

      <Text style={paragraph}>
        If you have a moment, your feedback means the world to {chefName} and helps them continue
        delivering exceptional experiences.
      </Text>

      <Button style={secondaryButton} href={reviewUrl}>
        Leave a Review
      </Button>

      {rebookUrl && (
        <>
          <Hr style={divider} />

          <Text style={paragraph}>
            Ready for round two? Use the link below to book again with your last dinner details
            already loaded.
          </Text>

          <Button style={primaryButton} href={rebookUrl}>
            Book Again
          </Button>

          {rebookQrUrl && (
            <>
              <Text style={muted}>Prefer to scan? Use this QR code.</Text>
              <Img
                src={rebookQrUrl}
                alt="Re-book QR code"
                width="160"
                height="160"
                style={qrImage}
              />
            </>
          )}
        </>
      )}

      <Text style={muted}>It only takes a minute. Thank you for choosing ChefFlow!</Text>
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

const secondaryButton = {
  backgroundColor: '#ffffff',
  color: '#18181b',
  padding: '11px 23px',
  borderRadius: '6px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block' as const,
  border: '1px solid #d4d4d8',
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
}

const qrImage = {
  display: 'block',
  margin: '12px auto 24px',
  borderRadius: '12px',
}
