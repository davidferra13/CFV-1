// Booking Confirmation Email
// Sent to consumer immediately after open booking submission.
// Differs from inquiry-received: addresses multiple-chef matching,
// includes status page link for tracking.

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type BookingConfirmationProps = {
  consumerName: string
  occasion: string
  eventDate: string | null
  guestCount: number
  guestCountRangeLabel: string | null
  location: string
  matchedChefCount: number
  statusUrl: string
  circleUrl?: string
}

export function BookingConfirmationEmail({
  consumerName,
  occasion,
  eventDate,
  guestCount,
  guestCountRangeLabel,
  location,
  matchedChefCount,
  statusUrl,
  circleUrl,
}: BookingConfirmationProps) {
  const hasMatches = matchedChefCount > 0
  const guestDisplay = guestCountRangeLabel
    ? `${guestCount} (from ${guestCountRangeLabel.split(' (')[0]} range)`
    : `${guestCount}`
  const preview = hasMatches
    ? `Your request was sent to ${matchedChefCount} chef${matchedChefCount !== 1 ? 's' : ''}.`
    : 'We received your request and saved it for coverage follow-up.'

  return (
    <BaseLayout preview={preview}>
      <Text style={heading}>Request received</Text>
      <Text style={paragraph}>Hi {consumerName},</Text>
      {hasMatches ? (
        <Text style={paragraph}>
          Your request has been sent to {matchedChefCount} chef
          {matchedChefCount !== 1 ? 's' : ''} near {location}. Matched chefs will review the details
          and reach out directly, usually within 24 hours.
        </Text>
      ) : (
        <Text style={paragraph}>
          We do not have an available chef match near {location} yet. Your request has been saved,
          and you can use the status page below to check for updates or browse chef profiles.
        </Text>
      )}

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Occasion</td>
            <td style={detailValue}>{occasion}</td>
          </tr>
          {eventDate && (
            <tr>
              <td style={detailLabel}>Requested date</td>
              <td style={detailValue}>{eventDate}</td>
            </tr>
          )}
          <tr>
            <td style={detailLabel}>Guests</td>
            <td style={detailValue}>{guestDisplay}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Location</td>
            <td style={detailValue}>{location}</td>
          </tr>
        </tbody>
      </table>

      <Text style={paragraph}>
        Track the status of your request anytime:{' '}
        <a href={statusUrl} style={linkStyle}>
          View your booking status
        </a>
      </Text>

      {circleUrl && (
        <Text style={paragraph}>
          A planning space has been set up for your event:{' '}
          <a href={circleUrl} style={linkStyle}>
            Open your planning space
          </a>
        </Text>
      )}

      <Text style={footer}>
        {hasMatches
          ? 'You will receive an email when a chef responds. If no chef responds within 48 hours, we will follow up with alternative options.'
          : 'We will email you if coverage opens up for this request.'}
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

const detailsTable = {
  width: '100%',
  marginBottom: '24px',
  borderCollapse: 'collapse' as const,
}

const detailLabel = {
  fontSize: '13px',
  color: '#6b7280',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
  width: '120px',
}

const detailValue = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#18181b',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
}

const linkStyle = {
  color: '#2563eb',
  textDecoration: 'underline',
}

const footer = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#6b7280',
  margin: '0',
}
