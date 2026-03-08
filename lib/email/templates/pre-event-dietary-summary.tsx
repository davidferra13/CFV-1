// Pre-Event Dietary Summary Email
// Sent to the chef 48 hours before an event with the full dietary rollup.

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type DietaryItem = { label: string; count: number }

type Props = {
  chefName: string
  eventDate: string
  occasion: string
  clientName: string
  guestCount: number
  guestsWithInfo: number
  allergies: DietaryItem[]
  restrictions: DietaryItem[]
  eventUrl: string
}

export function PreEventDietarySummaryEmail({
  chefName,
  eventDate,
  occasion,
  clientName,
  guestCount,
  guestsWithInfo,
  allergies,
  restrictions,
  eventUrl,
}: Props) {
  return (
    <BaseLayout brand={brand} preview={`Dietary summary for ${occasion} on ${eventDate}`}>
      <Text style={heading}>Dietary Summary</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        Here is the dietary rollup for{' '}
        <strong>
          {clientName}&apos;s {occasion}
        </strong>{' '}
        on <strong>{eventDate}</strong>. {guestsWithInfo} of {guestCount} guests have shared their
        preferences.
      </Text>

      {allergies.length > 0 && (
        <>
          <Text style={sectionLabel}>ALLERGIES (critical)</Text>
          <div style={listBox}>
            {allergies.map((a) => (
              <Text key={a.label} style={listItem}>
                <span style={alertDot} /> {a.label} - {a.count} {a.count === 1 ? 'guest' : 'guests'}
              </Text>
            ))}
          </div>
        </>
      )}

      {restrictions.length > 0 && (
        <>
          <Text style={sectionLabel}>DIETARY RESTRICTIONS</Text>
          <div style={listBox}>
            {restrictions.map((r) => (
              <Text key={r.label} style={listItem}>
                <span style={warningDot} /> {r.label} - {r.count}{' '}
                {r.count === 1 ? 'guest' : 'guests'}
              </Text>
            ))}
          </div>
        </>
      )}

      {allergies.length === 0 && restrictions.length === 0 && (
        <Text style={paragraph}>
          No dietary restrictions or allergies have been reported for this guest list.
        </Text>
      )}

      <div style={{ textAlign: 'center' as const, margin: '24px 0' }}>
        <a
          href={eventUrl}
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
          View Event Details
        </a>
      </div>
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

const listBox: React.CSSProperties = {
  backgroundColor: '#fafaf9',
  border: '1px solid #e7e5e4',
  borderRadius: '8px',
  padding: '12px 16px',
}

const listItem: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#292524',
  margin: '4px 0',
}

const alertDot: React.CSSProperties = {
  display: 'inline-block',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#dc2626',
  marginRight: '6px',
}

const warningDot: React.CSSProperties = {
  display: 'inline-block',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#d97706',
  marginRight: '6px',
}
