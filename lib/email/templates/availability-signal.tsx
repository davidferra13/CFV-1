// Availability Signal Email
// Sent to opted-in clients when a chef publishes a new availability signal

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type AvailabilitySignalProps = {
  clientName: string
  chefName: string
  title: string
  date: string
  publicNote: string | null
}

export function AvailabilitySignalEmail({
  clientName,
  chefName,
  title,
  date,
  publicNote,
}: AvailabilitySignalProps) {
  return (
    <BaseLayout preview={`${chefName} has availability on ${date}`}>
      <Text style={heading}>New Availability</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        <strong>{chefName}</strong> just opened up availability:
      </Text>
      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Date</td>
            <td style={detailValue}>{date}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Event</td>
            <td style={detailValue}>{title}</td>
          </tr>
          {publicNote && (
            <tr>
              <td style={detailLabel}>Note</td>
              <td style={detailValue}>{publicNote}</td>
            </tr>
          )}
        </tbody>
      </table>
      <Text style={paragraph}>
        If you&apos;re interested, reach out to your chef to book this date before it fills up!
      </Text>
      <Text style={muted}>
        You received this because you opted in to availability notifications. You can manage your
        notification preferences in your ChefFlow account settings.
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

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
