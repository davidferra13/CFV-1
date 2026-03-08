// Review Submitted — Chef Notification Email
// Sent to the chef when a client submits a review for a completed event.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type Props = {
  chefName: string
  clientName: string
  occasion: string
  rating: number
  reviewExcerpt: string | null
  reviewUrl: string
}

export function ReviewSubmittedChefEmail({
  chefName,
  clientName,
  occasion,
  rating,
  reviewExcerpt,
  reviewUrl,
}: Props) {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating)

  return (
    <BaseLayout brand={brand} preview={`${clientName} left you a review`}>
      <Text style={heading}>New review received</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        <strong>{clientName}</strong> left a review for your <strong>{occasion}</strong> event.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Rating</td>
            <td style={{ ...detailValue, color: '#d97706', fontSize: '20px' }}>{stars}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Client</td>
            <td style={detailValue}>{clientName}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Event</td>
            <td style={detailValue}>{occasion}</td>
          </tr>
        </tbody>
      </table>

      {reviewExcerpt && <Text style={quote}>"{reviewExcerpt}"</Text>}

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={reviewUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#78350f',
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          View Review
        </Link>
      </div>

      <Text style={muted}>
        Reviews help build your reputation and attract new clients. Thank you for delivering a great
        experience.
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
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 16px' }
const detailsTable = { width: '100%', marginBottom: '24px', borderCollapse: 'collapse' as const }
const detailLabel = {
  fontSize: '13px',
  color: '#6b7280',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
  width: '140px',
}
const detailValue = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#18181b',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
}
const quote = {
  fontSize: '15px',
  fontStyle: 'italic',
  color: '#374151',
  borderLeft: '3px solid #d97706',
  paddingLeft: '16px',
  margin: '0 0 24px',
}
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
