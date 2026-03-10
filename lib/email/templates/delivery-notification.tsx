// Delivery Notification Email
// Sent to client when their meal prep delivery is on the way

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type DeliveryNotificationProps = {
  clientName: string
  chefName: string
  deliveryWindow: string
  mealCount: number
  containerCount: number
  deliveryInstructions: string | null
  brand?: ChefBrandProps
}

export function DeliveryNotificationEmail({
  clientName,
  chefName,
  deliveryWindow,
  mealCount,
  containerCount,
  deliveryInstructions,
  brand,
}: DeliveryNotificationProps) {
  return (
    <BaseLayout brand={brand} preview="Your meals are on the way!">
      <Text style={heading}>Your meals are on the way!</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        <strong>{chefName}</strong> is heading out with your delivery. Here are the details:
      </Text>
      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Expected delivery</td>
            <td style={detailValue}>{deliveryWindow}</td>
          </tr>
          {mealCount > 0 && (
            <tr>
              <td style={detailLabel}>Meals</td>
              <td style={detailValue}>{mealCount}</td>
            </tr>
          )}
          {containerCount > 0 && (
            <tr>
              <td style={detailLabel}>Containers</td>
              <td style={detailValue}>{containerCount}</td>
            </tr>
          )}
        </tbody>
      </table>
      {deliveryInstructions && (
        <Text style={paragraph}>
          <strong>Delivery instructions:</strong> {deliveryInstructions}
        </Text>
      )}
      <Text style={paragraph}>
        Please make sure someone is available to receive the delivery during your scheduled window.
        If you need to make any changes, reach out to your chef directly.
      </Text>
      <Text style={muted}>This is an automated notification from {chefName}.</Text>
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
  width: '140px',
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
