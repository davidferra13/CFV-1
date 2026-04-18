// Event Proposed Email
// Sent to client when chef proposes an event (draft → proposed)

import { Button, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type EventProposedProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  guestCount: number | null
  location: string | null
  eventUrl: string
  coHostNames?: string[]
}

export function EventProposedEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  guestCount,
  location,
  eventUrl,
  coHostNames,
}: EventProposedProps) {
  return (
    <BaseLayout preview={`${chefName} sent you an event proposal`}>
      <Text style={heading}>Event proposal</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        <strong>{chefName}</strong> has prepared an event proposal for you. Review the details and
        let your chef know if everything looks good.
      </Text>
      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Occasion</td>
            <td style={detailValue}>{occasion}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Date</td>
            <td style={detailValue}>{eventDate}</td>
          </tr>
          {guestCount && (
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
          {coHostNames && coHostNames.length > 0 && (
            <tr>
              <td style={detailLabel}>Co-hosted with</td>
              <td style={detailValue}>{coHostNames.join(', ')}</td>
            </tr>
          )}
        </tbody>
      </table>
      <Button style={button} href={eventUrl}>
        View Proposal
      </Button>
      <Text style={authNote}>
        You may need to sign in or create a free account to view your event details.
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

const button = {
  backgroundColor: '#18181b',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block' as const,
  marginBottom: '12px',
}

const authNote = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0 0 24px',
  lineHeight: '1.5',
}
