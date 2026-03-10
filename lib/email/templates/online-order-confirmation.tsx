import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type OrderItem = {
  name: string
  quantity: number
  totalFormatted: string
}

type Props = {
  customerName: string
  businessName: string
  orderNumber: string
  items: OrderItem[]
  totalFormatted: string
  estimatedReadyMinutes: number
  orderType: 'pickup' | 'dine_in'
}

const brand: ChefBrandProps = {
  showPoweredBy: true,
}

export function OnlineOrderConfirmationEmail({
  customerName,
  businessName,
  orderNumber,
  items,
  totalFormatted,
  estimatedReadyMinutes,
  orderType,
}: Props) {
  return (
    <BaseLayout brand={brand} preview={`Order confirmed! #${orderNumber} from ${businessName}`}>
      <Text style={heading}>Order confirmed!</Text>
      <Text style={paragraph}>Hi {customerName},</Text>
      <Text style={paragraph}>
        Your order with {businessName} has been received. We are preparing it now.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={label}>Order #</td>
            <td style={value}>{orderNumber}</td>
          </tr>
          <tr>
            <td style={label}>Type</td>
            <td style={value}>{orderType === 'pickup' ? 'Pickup' : 'Dine-in'}</td>
          </tr>
          <tr>
            <td style={label}>Estimated Ready</td>
            <td style={value}>~{estimatedReadyMinutes} minutes</td>
          </tr>
        </tbody>
      </table>

      <Text style={sectionTitle}>Items</Text>
      <table style={detailsTable}>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={label}>
                {item.quantity}x {item.name}
              </td>
              <td style={value}>{item.totalFormatted}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...label, fontWeight: '600' }}>Total</td>
            <td style={{ ...value, fontWeight: '700' }}>{totalFormatted}</td>
          </tr>
        </tbody>
      </table>

      {orderType === 'pickup' && (
        <Text style={paragraph}>
          We will have your order ready for pickup. No need to call ahead.
        </Text>
      )}

      <Text style={muted}>Thank you for your order!</Text>
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

const sectionTitle = {
  fontSize: '16px',
  fontWeight: '600' as const,
  color: '#18181b',
  margin: '16px 0 8px',
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
  width: '60%',
}

const value = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#18181b',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
  textAlign: 'right' as const,
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
