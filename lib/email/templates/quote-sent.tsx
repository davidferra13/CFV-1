// Quote Sent Email
// Sent to client when chef sends a quote

import { Button, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type QuoteSentProps = {
  clientName: string
  chefName: string
  totalFormatted: string
  depositFormatted: string | null
  depositRequired: boolean
  occasion: string | null
  validUntil: string | null
  quoteUrl: string
}

export function QuoteSentEmail({
  clientName,
  chefName,
  totalFormatted,
  depositFormatted,
  depositRequired,
  occasion,
  validUntil,
  quoteUrl,
}: QuoteSentProps) {
  const eventLabel = occasion || 'your event'

  return (
    <BaseLayout preview={`New quote from ${chefName}: ${totalFormatted}`}>
      <Text style={heading}>You have a new quote</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        <strong>{chefName}</strong> has sent you a quote for {eventLabel}.
      </Text>
      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Total</td>
            <td style={detailValue}>{totalFormatted}</td>
          </tr>
          {depositRequired && depositFormatted && (
            <tr>
              <td style={detailLabel}>Deposit</td>
              <td style={detailValue}>{depositFormatted}</td>
            </tr>
          )}
          {validUntil && (
            <tr>
              <td style={detailLabel}>Valid until</td>
              <td style={detailValue}>{validUntil}</td>
            </tr>
          )}
        </tbody>
      </table>
      <Button style={button} href={quoteUrl}>
        View Quote
      </Button>
      <Text style={muted}>
        Log in to your ChefFlow account to review the full details and accept or discuss the quote.
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
