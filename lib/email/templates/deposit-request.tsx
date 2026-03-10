// Deposit Request Email
// Sent to client after quote acceptance when deposit is required.
// Links to the client portal payment page for the event.

import { Button, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type DepositRequestProps = {
  clientName: string
  chefName: string
  occasion: string
  eventDate: string
  guestCount: number | null
  depositAmountFormatted: string
  totalFormatted: string
  paymentUrl: string
  brand?: ChefBrandProps
}

export function DepositRequestEmail({
  clientName,
  chefName,
  occasion,
  eventDate,
  guestCount,
  depositAmountFormatted,
  totalFormatted,
  paymentUrl,
  brand,
}: DepositRequestProps) {
  return (
    <BaseLayout
      preview={`Deposit request from ${chefName}: ${depositAmountFormatted}`}
      brand={brand}
    >
      <Text style={heading}>Deposit request</Text>
      <Text style={paragraph}>Hi {clientName},</Text>
      <Text style={paragraph}>
        Great news! Your quote for {occasion} with <strong>{chefName}</strong> has been accepted. To
        secure your date, a deposit of <strong>{depositAmountFormatted}</strong> is required.
      </Text>

      <table style={detailsTable}>
        <tbody>
          <tr>
            <td style={detailLabel}>Event</td>
            <td style={detailValue}>{occasion}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Date</td>
            <td style={detailValue}>{eventDate}</td>
          </tr>
          {guestCount && (
            <tr>
              <td style={detailLabel}>Guests</td>
              <td style={detailValue}>{guestCount}</td>
            </tr>
          )}
          <tr>
            <td style={detailLabel}>Total quoted</td>
            <td style={detailValue}>{totalFormatted}</td>
          </tr>
          <tr>
            <td style={detailLabel}>Deposit due</td>
            <td style={detailValue}>{depositAmountFormatted}</td>
          </tr>
        </tbody>
      </table>

      <Button style={button} href={paymentUrl}>
        Pay Deposit
      </Button>

      <Text style={muted}>
        If you have already arranged payment with {chefName} directly (cash, Venmo, etc.), you can
        disregard this email. Questions? Reach out through your ChefFlow portal.
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
  width: '140px',
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
