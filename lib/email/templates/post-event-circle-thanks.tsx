// Post-Event Circle Thank You Email
// Sent to all circle members (including guests) after a dinner is completed.
// For guests without accounts: includes a soft CTA to create an account.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  recipientName: string
  chefName: string
  occasion: string
  eventDate: string
  menuHighlights: string[]
  isGuest: boolean // true = no account, show signup CTA
  signupUrl?: string
  circleUrl?: string
  bookUrl?: string
}

export function PostEventCircleThanksEmail({
  recipientName,
  chefName,
  occasion,
  eventDate,
  menuHighlights,
  isGuest,
  signupUrl,
  circleUrl,
  bookUrl,
}: Props) {
  return (
    <BaseLayout preview={`Thanks for joining ${occasion}!`}>
      <Text style={heading}>Thanks for a great evening!</Text>
      <Text style={paragraph}>Hi {recipientName},</Text>
      <Text style={paragraph}>
        Thank you for being part of <strong>{occasion}</strong> on {eventDate}
        {chefName ? ` with Chef ${chefName}` : ''}. We hope you had an amazing time.
      </Text>

      {menuHighlights.length > 0 && (
        <>
          <Text style={sectionLabel}>WHAT WAS ON THE MENU</Text>
          <div style={menuBox}>
            {menuHighlights.map((item, i) => (
              <Text key={i} style={menuItem}>
                {item}
              </Text>
            ))}
          </div>
        </>
      )}

      {circleUrl && (
        <div style={{ textAlign: 'center' as const, margin: '24px 0' }}>
          <Link href={circleUrl} style={buttonStyle}>
            See Your Circle
          </Link>
        </div>
      )}

      {isGuest && (
        <div style={guestCta}>
          <Text style={ctaHeading}>Want to host your own dinner?</Text>
          <Text style={ctaText}>
            Create a free account to save your preferences, invite your own friends, and book a
            private chef experience for your next gathering.
          </Text>
          <div style={{ textAlign: 'center' as const, marginTop: '12px' }}>
            {signupUrl && (
              <Link href={signupUrl} style={secondaryButton}>
                Create Free Account
              </Link>
            )}
            {bookUrl && (
              <>
                {' '}
                <Link href={bookUrl} style={ghostButton}>
                  Book a Dinner
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </BaseLayout>
  )
}

const heading: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#1c1917',
  marginBottom: '16px',
}

const paragraph: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#44403c',
  marginBottom: '12px',
}

const sectionLabel: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.05em',
  color: '#78350f',
  marginBottom: '8px',
  marginTop: '20px',
}

const menuBox: React.CSSProperties = {
  backgroundColor: '#fafaf9',
  border: '1px solid #e7e5e4',
  borderRadius: '8px',
  padding: '12px 16px',
}

const menuItem: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#292524',
  margin: '4px 0',
}

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#78350f',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '15px',
  textDecoration: 'none',
}

const guestCta: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '20px',
  marginTop: '24px',
}

const ctaHeading: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#78350f',
  margin: '0 0 8px 0',
}

const ctaText: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#92400e',
  margin: '0',
}

const secondaryButton: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#78350f',
  color: '#ffffff',
  padding: '10px 20px',
  borderRadius: '6px',
  fontWeight: '600',
  fontSize: '14px',
  textDecoration: 'none',
}

const ghostButton: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: 'transparent',
  color: '#78350f',
  padding: '10px 20px',
  borderRadius: '6px',
  fontWeight: '600',
  fontSize: '14px',
  textDecoration: 'underline',
}
