// Gift Card Purchased — Chef Notification Email
// Sent to the chef when someone purchases a gift card from their profile.

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type Props = {
  chefName: string
  buyerName: string | null
  recipientName: string | null
  amountFormatted: string
  code: string
}

export function GiftCardPurchasedChefEmail({
  chefName,
  buyerName,
  recipientName,
  amountFormatted,
  code,
}: Props) {
  const buyer = buyerName || 'Someone'
  const recipient = recipientName || 'a recipient'

  return (
    <BaseLayout brand={brand} preview={`${amountFormatted} gift card sold`}>
      <Text style={heading}>Gift card sold</Text>
      <Text style={paragraph}>Hi {chefName},</Text>
      <Text style={paragraph}>
        <strong>{buyer}</strong> purchased a {amountFormatted} gift card for{' '}
        <strong>{recipient}</strong>.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Amount</td>
            <td style={detailValue}>{amountFormatted}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Purchased by</td>
            <td style={detailValue}>{buyer}</td>
          </tr>
          <tr>
            <td style={detailLabel}>For</td>
            <td style={detailValue}>{recipient}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Code</td>
            <td style={{ ...detailValue, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              {code}
            </td>
          </tr>
        </tbody>
      </table>

      <Text style={paragraph}>
        The gift card has been delivered to the recipient. When they&apos;re ready to book,
        they&apos;ll apply the code at checkout.
      </Text>

      <Text style={muted}>You can manage gift cards from the Financials section.</Text>
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
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
