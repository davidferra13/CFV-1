// Booking Follow-Up Email (48 hours, no chef response)
// Sent when no chef has responded to an open booking within 48 hours.
// Provides alternatives: browse profiles, submit direct inquiry, check status.

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type BookingFollowUpProps = {
  consumerName: string
  occasion: string
  statusUrl: string
  browseUrl: string
}

export function BookingFollowUpEmail({
  consumerName,
  occasion,
  statusUrl,
  browseUrl,
}: BookingFollowUpProps) {
  return (
    <BaseLayout preview={`Update on your request for "${occasion}"`}>
      <Text style={heading}>Still looking for your chef</Text>
      <Text style={paragraph}>Hi {consumerName},</Text>
      <Text style={paragraph}>
        We have not found a match for your "{occasion}" request yet. This can happen when chefs in
        your area have full schedules for your date.
      </Text>

      <Text style={paragraph}>Here are some things you can try:</Text>

      <table style={actionsTable}>
        <tbody>
          <tr>
            <td style={actionNumber}>1</td>
            <td style={actionText}>
              <a href={browseUrl} style={linkStyle}>
                Browse chef profiles
              </a>{' '}
              and reach out to one directly
            </td>
          </tr>
          <tr>
            <td style={actionNumber}>2</td>
            <td style={actionText}>
              Consider adjusting your date or guest count for more availability
            </td>
          </tr>
          <tr>
            <td style={actionNumber}>3</td>
            <td style={actionText}>
              <a href={statusUrl} style={linkStyle}>
                Check your request status
              </a>{' '}
              for real-time updates
            </td>
          </tr>
        </tbody>
      </table>

      <Text style={footer}>
        Your request is still active. If a chef becomes available, they will reach out to you
        directly.
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
