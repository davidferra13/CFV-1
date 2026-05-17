// Cannabis Cadence Chef Reminder Email
// Sent to the chef when cannabis compliance items need attention.

import { Text, Button, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type CannabisCadencePoint =
  | 'cannabis_attestation_reminder'
  | 'cannabis_onboarding_reminder'
  | 'cannabis_closeout_reminder'

type Props = {
  chefName: string
  occasion: string
  eventDate: string
  cadencePoint: CannabisCadencePoint
  message: string
  actionUrl: string
  pendingItems?: string[]
}

function getHeading(cadencePoint: CannabisCadencePoint): string {
  switch (cadencePoint) {
    case 'cannabis_attestation_reminder':
      return 'Compliance Action Needed'
    case 'cannabis_onboarding_reminder':
      return 'Guest Intake Incomplete'
    case 'cannabis_closeout_reminder':
      return 'Post-Event Documentation'
    default:
      return 'Cannabis Event Update'
  }
}

function getPreview(cadencePoint: CannabisCadencePoint, occasion: string): string {
  switch (cadencePoint) {
    case 'cannabis_attestation_reminder':
      return `Compliance items pending for ${occasion}`
    case 'cannabis_onboarding_reminder':
      return `Guest intake incomplete for ${occasion}`
    case 'cannabis_closeout_reminder':
      return `Control packet needs attention for ${occasion}`
    default:
      return `Cannabis update for ${occasion}`
  }
}

function getButtonLabel(cadencePoint: CannabisCadencePoint): string {
  switch (cadencePoint) {
    case 'cannabis_attestation_reminder':
      return 'Review Compliance'
    case 'cannabis_onboarding_reminder':
      return 'View Guest Status'
    case 'cannabis_closeout_reminder':
      return 'Complete Control Packet'
    default:
      return 'View Details'
  }
}

export function CannabisCadenceChefEmail({
  chefName,
  occasion,
  eventDate,
  cadencePoint,
  message,
  actionUrl,
  pendingItems,
}: Props) {
  return (
    <BaseLayout preview={getPreview(cadencePoint, occasion)}>
      <Text style={heading}>{getHeading(cadencePoint)}</Text>

      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>{message}</Text>

      <Hr style={divider} />

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Event</td>
            <td style={detailValue}>{occasion}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Date</td>
            <td style={detailValue}>
              {new Date(eventDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </td>
          </tr>
        </tbody>
      </table>

      {pendingItems && pendingItems.length > 0 && (
        <>
          <Hr style={divider} />
          <Text style={pendingHeader}>Pending items:</Text>
          {pendingItems.map((item, i) => (
            <Text key={i} style={pendingItem}>
              {'•'} {item}
            </Text>
          ))}
        </>
      )}

      <Hr style={divider} />

      <Button href={actionUrl} style={ctaButton}>
        {getButtonLabel(cadencePoint)}
      </Button>

      <Text style={muted}>
        This is an automated compliance reminder. Cannabis events require complete documentation
        before, during, and after service.
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

const pendingHeader = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#374151',
  margin: '0 0 8px',
}

const pendingItem = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 4px',
  paddingLeft: '8px',
}

const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#2e7d32',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  margin: '4px 0 20px',
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '16px 0 0',
  lineHeight: '1.5',
}
