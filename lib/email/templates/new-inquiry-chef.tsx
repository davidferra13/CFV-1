// New Inquiry — Chef Notification Email
// Sent to the chef when a new inquiry arrives (via public portal, Wix, or Gmail).
// Complements the in-app notification and bell badge.

import { Text, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type Props = {
  chefName: string
  clientName: string
  occasion: string | null
  eventDate: string | null    // Already formatted or null
  guestCount: number | null
  source: 'portal' | 'wix' | 'gmail' | 'manual'
  inquiryUrl: string
}

const SOURCE_LABELS: Record<Props['source'], string> = {
  portal: 'your public profile',
  wix:    'your Wix website',
  gmail:  'your Gmail inbox',
  manual: 'manual entry',
}

export function NewInquiryChefEmail({
  chefName,
  clientName,
  occasion,
  eventDate,
  guestCount,
  source,
  inquiryUrl,
}: Props) {
  return (
    <BaseLayout preview={`New inquiry from ${clientName}`}>
      <Text style={heading}>New inquiry</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        <strong>{clientName}</strong> submitted a new inquiry via {SOURCE_LABELS[source]}.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>From</td>
            <td style={detailValue}>{clientName}</td>
          </tr>
          {occasion && (
            <tr>
              <td style={detailLabel}>Occasion</td>
              <td style={detailValue}>{occasion}</td>
            </tr>
          )}
          {eventDate && (
            <tr>
              <td style={detailLabel}>Event date</td>
              <td style={detailValue}>{eventDate}</td>
            </tr>
          )}
          {guestCount && (
            <tr>
              <td style={detailLabel}>Guests</td>
              <td style={detailValue}>{guestCount}</td>
            </tr>
          )}
          <tr>
            <td style={detailLabel}>Source</td>
            <td style={detailValue}>{SOURCE_LABELS[source]}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <Link
          href={inquiryUrl}
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
          View Inquiry
        </Link>
      </div>

      <Text style={muted}>
        Reply within 24 hours to maximize booking conversion.
      </Text>
    </BaseLayout>
  )
}

const heading = { fontSize: '24px', fontWeight: '600' as const, color: '#18181b', margin: '0 0 16px' }
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 16px' }
const detailsTable = { width: '100%', marginBottom: '24px', borderCollapse: 'collapse' as const }
const detailLabel = { fontSize: '13px', color: '#6b7280', padding: '8px 0', borderBottom: '1px solid #f3f4f6', width: '140px' }
const detailValue = { fontSize: '15px', fontWeight: '600' as const, color: '#18181b', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
