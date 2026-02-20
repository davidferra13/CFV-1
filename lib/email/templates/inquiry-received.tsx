// Inquiry Received Email
// Sent to client when they submit the public inquiry form
// No portal account exists yet — no CTA button, just acknowledgment

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type InquiryReceivedProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string | null
}

export function InquiryReceivedEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
}: InquiryReceivedProps) {
  return (
    <BaseLayout preview={`${chefName} received your inquiry`}>
      <Text style={heading}>Inquiry received</Text>
      <Text style={paragraph}>
        Hi {clientName},
      </Text>
      <Text style={paragraph}>
        Thank you for reaching out to <strong>{chefName}</strong>. Your inquiry
        has been received and will be reviewed shortly. You can expect to hear
        back within 1–2 business days.
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
        </tbody>
      </table>
      <Text style={footer}>
        Once your chef reviews the details, they will send you a formal
        proposal to review and approve.
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

const footer = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#6b7280',
  margin: '0',
}
