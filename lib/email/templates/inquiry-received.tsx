// Inquiry Received Email
// Sent to client when they submit the public inquiry form.
// No portal account exists yet - gives the client a clear confirmation,
// event summary, and what to expect next.

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type InquiryReceivedProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string | null
  guestCount?: number | null
  location?: string | null
  serveTime?: string | null
  circleUrl?: string
}

export function InquiryReceivedEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  guestCount,
  location,
  serveTime,
  circleUrl,
}: InquiryReceivedProps) {
  return (
    <BaseLayout preview={`Got it. ${chefName} will be in touch within 24 hours.`}>
      <Text style={heading}>Inquiry received</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Your inquiry is in. {chefName} will review the details and follow up within 24 hours with
        availability, questions, and next steps.
      </Text>

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
          {serveTime && (
            <tr>
              <td style={detailLabel}>Serve time</td>
              <td style={detailValue}>{serveTime}</td>
            </tr>
          )}
          {guestCount != null && guestCount > 0 && (
            <tr>
              <td style={detailLabel}>Guests</td>
              <td style={detailValue}>{guestCount}</td>
            </tr>
          )}
          {location && (
            <tr>
              <td style={detailLabel}>Location</td>
              <td style={detailValue}>{location}</td>
            </tr>
          )}
        </tbody>
      </table>

      {circleUrl ? (
        <Text style={paragraph}>
          A planning space has been set up for your event. You can use it to message {chefName},{' '}
          track menu progress, and coordinate details:{' '}
          <a href={circleUrl} style={linkStyle}>
            Open your planning space
          </a>
        </Text>
      ) : (
        <Text style={paragraph}>
          Keep an eye on your inbox. {chefName} will reach out directly to discuss menus, logistics,
          and pricing.
        </Text>
      )}

      <Text style={footer}>
        If you have any immediate questions, reply to this email and it will go directly to{' '}
        {chefName}.
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
