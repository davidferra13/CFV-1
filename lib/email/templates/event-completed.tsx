// Event Completed Email
// Sent to client when chef marks event as completed.
// Two CTAs: view receipt (primary) and leave a review (secondary).

import { Button, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type EventCompletedProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  receiptUrl: string
  reviewUrl: string
  guestCount?: number | null
  /** Dish/course names served at the event, pulled from the linked menu */
  menuHighlights?: string[]
}

export function EventCompletedEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  receiptUrl,
  reviewUrl,
  guestCount,
  menuHighlights,
}: EventCompletedProps) {
  const firstName = clientName?.split(' ')[0] || clientName
  const guestLine =
    guestCount && guestCount > 1
      ? `you and your ${guestCount - 1} guest${guestCount - 1 === 1 ? '' : 's'}`
      : 'you'

  return (
    <BaseLayout preview={`Thank you for dining with ${chefName}`}>
      <Text style={heading}>Thank you for a wonderful evening!</Text>

      <Text style={paragraph}>Hi {firstName},</Text>

      <Text style={paragraph}>
        {chefName} had a great time cooking for {guestLine} at your <strong>{occasion}</strong> on{' '}
        {eventDate}. We hope it was an experience worth remembering.
      </Text>

      {menuHighlights && menuHighlights.length > 0 && (
        <>
          <Text style={menuLabel}>What {guestLine} enjoyed:</Text>
          <ul style={menuList}>
            {menuHighlights.map((dish, i) => (
              <li key={i} style={menuItem}>
                {dish}
              </li>
            ))}
          </ul>
        </>
      )}

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

      <Text style={muted}>It only takes a minute. Thank you for choosing {chefName}!</Text>
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

const menuLabel = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#374151',
  margin: '0 0 8px',
}

const menuList = {
  margin: '0 0 20px',
  paddingLeft: '20px',
}

const menuItem = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#4b5563',
  marginBottom: '4px',
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
