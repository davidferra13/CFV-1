// Subscription Invoice Email
// Sent to client for recurring meal prep billing

import { Button, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type SubscriptionInvoiceProps = {
  clientName: string
  amountFormatted: string
  periodStart: string
  periodEnd: string
  payNowUrl?: string
  brand?: ChefBrandProps
}

export function SubscriptionInvoiceEmail({
  clientName,
  amountFormatted,
  periodStart,
  periodEnd,
  payNowUrl,
  brand,
}: SubscriptionInvoiceProps) {
  return (
    <BaseLayout brand={brand} preview={`Your meal prep invoice: ${amountFormatted}`}>
      <Text style={heading}>Your meal prep invoice</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Here is your invoice for the meal prep period from <strong>{periodStart}</strong> to{' '}
        <strong>{periodEnd}</strong>.
      </Text>
      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Amount</td>
            <td style={detailValue}>{amountFormatted}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Period</td>
            <td style={detailValue}>
              {periodStart} to {periodEnd}
            </td>
          </tr>
          <tr>
            <td style={detailLabel}>Status</td>
            <td style={detailValue}>Due</td>
          </tr>
        </tbody>
      </table>
      {payNowUrl && (
        <Button style={button} href={payNowUrl}>
          Pay Now
        </Button>
      )}
      <Text style={muted}>
        If you have questions about this invoice, please reach out to your chef through ChefFlow.
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
  marginBottom: '24px',
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
