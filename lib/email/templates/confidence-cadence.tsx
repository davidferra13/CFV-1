// Pre-Event Confidence Cadence Email Template
// Dynamic content slots per cadence point. Uses brand voice via chef preset.
// Includes: message, portal link, "reply to update" CTA, event-specific data.

import { Text, Button, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type CadencePoint =
  | 'deposit_confirmed'
  | '30_days_before'
  | '14_days_before'
  | '7_days_before'
  | '3_days_before'
  | '1_day_before'
  | 'event_day'

type ConfidenceCadenceProps = {
  clientName: string
  chefName: string
  message: string
  occasion: string
  cadencePoint: CadencePoint
  eventDate: string
  guestCount: number | null
  location: string | null
  arrivalTime: string | null
  portalUrl?: string
  appUrl: string
}

function getPreviewText(cadencePoint: CadencePoint, occasion: string): string {
  switch (cadencePoint) {
    case 'deposit_confirmed':
      return `Your ${occasion} is confirmed!`
    case '30_days_before':
      return `Your ${occasion} is 30 days away`
    case '14_days_before':
      return `Two weeks until your ${occasion}`
    case '7_days_before':
      return `One week until your ${occasion}`
    case '3_days_before':
      return `Your ${occasion} is almost here`
    case '1_day_before':
      return `Tomorrow: your ${occasion}`
    case 'event_day':
      return `Today is the day! Your ${occasion}`
    default:
      return `Update on your ${occasion}`
  }
}

function getHeading(cadencePoint: CadencePoint, chefName: string): string {
  switch (cadencePoint) {
    case 'deposit_confirmed':
      return "You're booked!"
    case '30_days_before':
      return '30 days to go'
    case '14_days_before':
      return 'Two weeks out'
    case '7_days_before':
      return 'One week to go'
    case '3_days_before':
      return 'Almost here!'
    case '1_day_before':
      return "Tomorrow's the day"
    case 'event_day':
      return 'Today is the day!'
    default:
      return `Update from ${chefName}`
  }
}

export function ConfidenceCadenceEmail({
  clientName,
  chefName,
  message,
  occasion,
  cadencePoint,
  eventDate,
  guestCount,
  location,
  arrivalTime,
  portalUrl,
  appUrl,
}: ConfidenceCadenceProps) {
  const showDetails = cadencePoint !== 'event_day' && cadencePoint !== 'deposit_confirmed'
  const showArrival = cadencePoint === '3_days_before' || cadencePoint === '1_day_before'

  return (
    <BaseLayout preview={getPreviewText(cadencePoint, occasion)}>
      <Text style={heading}>{getHeading(cadencePoint, chefName)}</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>{message}</Text>

      {showDetails && (
        <>
          <Hr style={divider} />
          <table style={detailsTable}>
            <tbody>
              {eventDate && (
                <tr>
                  <td style={detailLabel}>Event Date</td>
                  <td style={detailValue}>
                    {new Date(eventDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              )}
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
              {showArrival && arrivalTime && (
                <tr>
                  <td style={detailLabel}>Chef Arrives</td>
                  <td style={detailValue}>{arrivalTime}</td>
                </tr>
              )}
            </tbody>
          </table>
          <Hr style={divider} />
        </>
      )}

      {portalUrl && (
        <Button href={portalUrl} style={ctaButton}>
          View Your Event Portal
        </Button>
      )}

      <Text style={replyHint}>
        Questions or updates? Simply reply to this email and {chefName} will receive your message
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

const divider = {
  borderColor: '#f3f4f6',
  margin: '20px 0',
}

const detailsTable = {
  width: '100%',
  marginBottom: '8px',
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

const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#18181b',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  margin: '4px 0 20px',
}

const replyHint = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '16px 0 0',
  lineHeight: '1.5',
}
