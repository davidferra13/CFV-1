import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type Props = {
  customerName: string
  businessName: string
  saleNumber: string
  saleDate: string
  totalFormatted: string
  paymentSummary: string
}

export function CommerceSaleReceiptEmail({
  customerName,
  businessName,
  saleNumber,
  saleDate,
  totalFormatted,
  paymentSummary,
}: Props) {
  return (
    <BaseLayout brand={brand} preview={`Receipt ${saleNumber} from ${businessName}`}>
      <Text style={heading}>Your receipt</Text>
      <Text style={paragraph}>Hi {customerName},</Text>
      <Text style={paragraph}>
        Thank you for your purchase with {businessName}. Your receipt is attached to this email.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={label}>Receipt #</td>
            <td style={value}>{saleNumber}</td>
          </tr>
          <tr>
            <td style={label}>Date</td>
            <td style={value}>{saleDate}</td>
          </tr>
          <tr>
            <td style={label}>Total</td>
            <td style={value}>{totalFormatted}</td>
          </tr>
          <tr>
            <td style={label}>Payment</td>
            <td style={value}>{paymentSummary}</td>
          </tr>
        </tbody>
      </table>

      <Text style={muted}>Keep this email for your records.</Text>
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
  marginBottom: '20px',
  borderCollapse: 'collapse' as const,
}

const label = {
  fontSize: '13px',
  color: '#6b7280',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
  width: '120px',
}

const value = {
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
