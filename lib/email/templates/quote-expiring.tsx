// Quote Expiring Email
// Sent to client 48 hours before their quote's valid_until deadline

import { Text, Button } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type QuoteExpiringProps = {
  clientName: string
  chefName: string
  occasion: string | null
  validUntil: string // pre-formatted date string
  totalFormatted: string // pre-formatted price string e.g. "$1,500.00"
  quoteId: string
  appUrl: string
  brand?: ChefBrandProps
}

export function QuoteExpiringEmail({
  clientName,
  chefName,
  occasion,
  validUntil,
  totalFormatted,
  quoteId,
  appUrl,
  brand,
}: QuoteExpiringProps) {
  const occasionLabel = occasion || 'your event'

  return (
    <BaseLayout brand={brand} preview={`Your quote for ${occasionLabel} expires in 48 hours`}>
      <Text style={heading}>Your quote expires soon</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Just a heads-up: the quote from <strong>{chefName}</strong> for your{' '}
        <strong>{occasionLabel}</strong> expires in less than 48 hours.
      </Text>

      <table style={summaryTable}>
        <tbody>
          <tr>
            <td style={summaryLabel}>Quoted price</td>
            <td style={summaryValue}>{totalFormatted}</td>
          </tr>
          <tr>
            <td style={summaryLabel}>Expires</td>
            <td style={{ ...summaryValue, color: '#dc2626' }}>{validUntil}</td>
          </tr>
        </tbody>
      </table>

      <Text style={paragraph}>
        If you&apos;d like to move forward, review and accept the quote before it expires. Once
        expired, you&apos;ll need to request a new one.
      </Text>

      <Button href={`${appUrl}/my-quotes/${quoteId}`} style={ctaButton}>
        Review Quote →
      </Button>

      <Text style={muted}>
        Not interested? No action needed — the quote will expire automatically.
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

const summaryTable = {
  width: '100%',
  marginBottom: '24px',
  borderCollapse: 'collapse' as const,
}

const summaryLabel = {
  fontSize: '13px',
  color: '#6b7280',
  padding: '10px 0',
  borderBottom: '1px solid #f3f4f6',
  width: '130px',
}

const summaryValue = {
  fontSize: '16px',
  fontWeight: '700' as const,
  color: '#18181b',
  padding: '10px 0',
  borderBottom: '1px solid #f3f4f6',
}

const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#dc2626',
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
  margin: '0',
}
