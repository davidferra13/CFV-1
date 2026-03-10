// Purchase Order Email
// Sent to vendor when chef sends a PO

import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type POItem = {
  name: string
  quantity: number
  unit: string
  unitCostFormatted: string | null
  totalFormatted: string | null
}

type Props = {
  poNumber: string
  vendorName: string
  orderDate: string
  expectedDeliveryDate: string | null
  items: POItem[]
  subtotalFormatted: string
  totalFormatted: string
  notes: string | null
  businessName: string
  businessPhone: string | null
  businessEmail: string
}

export function PurchaseOrderEmail({
  poNumber,
  vendorName,
  orderDate,
  expectedDeliveryDate,
  items,
  subtotalFormatted,
  totalFormatted,
  notes,
  businessName,
  businessPhone,
  businessEmail,
}: Props) {
  return (
    <BaseLayout
      preview={`Purchase Order ${poNumber} from ${businessName}`}
      brand={{ businessName, showPoweredBy: false }}
    >
      <Text style={heading}>Purchase Order {poNumber}</Text>
      <Text style={paragraph}>Hi {vendorName},</Text>
      <Text style={paragraph}>
        Please find the purchase order details below from {businessName}.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>PO Number</td>
            <td style={detailValue}>{poNumber}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Order Date</td>
            <td style={detailValue}>{orderDate}</td>
          </tr>
          {expectedDeliveryDate && (
            <tr>
              <td style={detailLabel}>Requested Delivery</td>
              <td style={detailValue}>{expectedDeliveryDate}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Items table */}
      <table style={itemsTable}>
        <thead>
          <tr>
            <th style={th}>Item</th>
            <th style={{ ...th, textAlign: 'center' as const }}>Qty</th>
            <th style={{ ...th, textAlign: 'center' as const }}>Unit</th>
            <th style={{ ...th, textAlign: 'right' as const }}>Unit Cost</th>
            <th style={{ ...th, textAlign: 'right' as const }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={td}>{item.name}</td>
              <td style={{ ...td, textAlign: 'center' as const }}>{item.quantity}</td>
              <td style={{ ...td, textAlign: 'center' as const }}>{item.unit}</td>
              <td style={{ ...td, textAlign: 'right' as const }}>
                {item.unitCostFormatted || '-'}
              </td>
              <td style={{ ...td, textAlign: 'right' as const }}>{item.totalFormatted || '-'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} style={{ ...td, fontWeight: '600', textAlign: 'right' as const }}>
              Subtotal
            </td>
            <td style={{ ...td, fontWeight: '600', textAlign: 'right' as const }}>
              {subtotalFormatted}
            </td>
          </tr>
          <tr>
            <td colSpan={4} style={{ ...td, fontWeight: '700', textAlign: 'right' as const }}>
              Total
            </td>
            <td style={{ ...td, fontWeight: '700', textAlign: 'right' as const }}>
              {totalFormatted}
            </td>
          </tr>
        </tfoot>
      </table>

      {notes && (
        <>
          <Text style={{ ...paragraph, fontWeight: '600' }}>Notes:</Text>
          <Text style={paragraph}>{notes}</Text>
        </>
      )}

      <Text style={paragraph}>
        Please confirm receipt of this order and expected delivery date at your earliest
        convenience.
      </Text>

      <Text style={contactSection}>
        <strong>{businessName}</strong>
        <br />
        {businessEmail}
        {businessPhone && (
          <>
            <br />
            {businessPhone}
          </>
        )}
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
  width: '160px',
}

const detailValue = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#18181b',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
}

const itemsTable = {
  width: '100%',
  marginBottom: '24px',
  borderCollapse: 'collapse' as const,
  border: '1px solid #e5e7eb',
}

const th = {
  fontSize: '12px',
  fontWeight: '600' as const,
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  padding: '10px 12px',
  borderBottom: '2px solid #e5e7eb',
  backgroundColor: '#f9fafb',
  textAlign: 'left' as const,
}

const td = {
  fontSize: '14px',
  color: '#374151',
  padding: '10px 12px',
  borderBottom: '1px solid #f3f4f6',
}

const contactSection = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: '1.6',
  marginTop: '24px',
  paddingTop: '16px',
  borderTop: '1px solid #e5e7eb',
}
