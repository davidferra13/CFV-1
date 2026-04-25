// Booking No-Match Email (7 days, no chef response)
// Final notice sent when no chef responded to an open booking after a week.
// Provides clear closure with actionable alternatives.

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type BookingNoMatchProps = {
  consumerName: string
  occasion: string
  browseUrl: string
  bookUrl: string
}

export function BookingNoMatchEmail({
  consumerName,
  occasion,
  browseUrl,
  bookUrl,
}: BookingNoMatchProps) {
  return (
    <BaseLayout preview={`Update on your "${occasion}" request`}>
      <Text style={heading}>We could not find a match</Text>
      <Text style={paragraph}>Hi {consumerName},</Text>
      <Text style={paragraph}>
        After a week, no chef has been able to take on your "{occasion}" request. This usually means
        chefs in your area are booked for that date or guest count.
      </Text>

      <Text style={paragraph}>You still have options:</Text>

      <table style={actionsTable}>
        <tbody>
          <tr>
            <td style={actionNumber}>1</td>
            <td style={actionText}>
              <a href={browseUrl} style={linkStyle}>
                Browse chef profiles
              </a>{' '}
              and send a direct inquiry to a specific chef
            </td>
          </tr>
          <tr>
            <td style={actionNumber}>2</td>
            <td style={actionText}>
              <a href={bookUrl} style={linkStyle}>
                Submit a new request
              </a>{' '}
              with a different date or guest count
            </td>
          </tr>
        </tbody>
      </table>

      <Text style={footer}>This request is now closed. Submit a new one anytime at no cost.</Text>
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

const actionsTable = {
  width: '100%',
  marginBottom: '24px',
  borderCollapse: 'collapse' as const,
}

const actionNumber = {
  fontSize: '14px',
  fontWeight: '700' as const,
  color: '#2563eb',
  padding: '10px 12px 10px 0',
  verticalAlign: 'top' as const,
  width: '24px',
}

const actionText = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  padding: '10px 0',
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
