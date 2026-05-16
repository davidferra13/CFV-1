// Invoice Delivery Email
// Sent when a chef sends/resends an invoice, or auto-sent after final payment.
// Clean, professional tone. PDF is attached (not inline).

import { Text, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type InvoiceDeliveryProps = {
  clientName: string
  chefBusinessName: string
  invoiceNumber: string
  occasion: string
  eventDate: string
  totalFormatted: string
  balanceDueFormatted: string
  isPaidInFull: boolean
}

export function InvoiceDeliveryEmail({
  clientName,
  chefBusinessName,
  invoiceNumber,
  occasion,
  eventDate,
  totalFormatted,
  balanceDueFormatted,
  isPaidInFull,
}: InvoiceDeliveryProps) {
  return (
    <BaseLayout preview={`Invoice ${invoiceNumber} from ${chefBusinessName}`}>
      <Text style={heading}>{isPaidInFull ? 'Your invoice is attached' : 'Invoice attached'}</Text>

      <Text style={paragraph}>Hi {clientName},</Text>

      <Text style={paragraph}>
        {isPaidInFull
          ? `Thank you for your payment. Attached is your complete invoice for ${occasion} on ${eventDate}, marked paid in full.`
          : `Attached is your invoice for ${occasion} on ${eventDate} from ${chefBusinessName}.`}
      </Text>

      <Hr style={divider} />

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Invoice</td>
            <td style={detailValue}>{invoiceNumber}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Event</td>
            <td style={detailValue}>{occasion}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Date</td>
            <td style={detailValue}>{eventDate}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Total</td>
            <td style={detailValue}>{totalFormatted}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Status</td>
            <td style={{ ...detailValue, color: isPaidInFull ? '#16a34a' : '#d97706' }}>
              {isPaidInFull ? 'Paid in full' : `Balance due: ${balanceDueFormatted}`}
            </td>
          </tr>
        </tbody>
      </table>

      <Hr style={divider} />

      <Text style={footnote}>
        The PDF invoice is attached to this email. You can forward it to your accounting department
        or save it for your records.
      </Text>

      <Text style={footnote}>
        If you have questions about this invoice, reply directly to this email or contact{' '}
        {chefBusinessName}.
      </Text>
    </BaseLayout>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const heading: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '16px',
}

const paragraph: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  marginBottom: '12px',
}

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const detailsTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
}

const detailLabel: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  padding: '6px 12px 6px 0',
  verticalAlign: 'top',
  width: '100px',
}

const detailValue: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#1a1a1a',
  padding: '6px 0',
  verticalAlign: 'top',
}

const footnote: React.CSSProperties = {
  fontSize: '13px',
  lineHeight: '1.5',
  color: '#6b7280',
  marginBottom: '8px',
}
