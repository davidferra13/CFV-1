import { Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'

type GiftCardPurchaseConfirmationEmailProps = {
  recipientEmail: string
  recipientName?: string | null
  amountFormatted: string // e.g. "$50.00"
  code: string
  chefName: string
  brand?: ChefBrandProps
}

export function GiftCardPurchaseConfirmationEmail({
  recipientEmail,
  recipientName,
  amountFormatted,
  code,
  chefName,
  brand,
}: GiftCardPurchaseConfirmationEmailProps) {
  const recipientLabel = recipientName ? `${recipientName} (${recipientEmail})` : recipientEmail

  return (
    <BaseLayout
      brand={brand}
      preview={`Your ${amountFormatted} gift card for ${chefName} has been sent`}
    >
      <Text style={heading}>Your gift card is on its way!</Text>

      <Text style={paragraph}>
        Your <strong>{amountFormatted} gift card</strong> for <strong>{chefName}</strong> has been
        sent to <strong>{recipientLabel}</strong>.
      </Text>

      <div style={codeCard}>
        <Text style={codeLabel}>Gift Card Code</Text>
        <Text style={codeValue}>{code}</Text>
        <Text style={valueText}>{amountFormatted} value</Text>
      </div>

      <Text style={paragraph}>
        The recipient will receive their own email with the code and instructions on how to redeem
        it when booking a private chef experience with {chefName}.
      </Text>

      <Text style={muted}>
        Please save this email for your records. If you have any questions, contact {chefName}{' '}
        directly.
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

const codeCard = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '0 0 20px',
  backgroundColor: '#f0fdf4',
}

const codeLabel = {
  margin: '0 0 4px',
  fontSize: '12px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
}

const codeValue = {
  margin: '0 0 8px',
  fontSize: '20px',
  fontWeight: '700' as const,
  color: '#111827',
  letterSpacing: '0.04em',
}

const valueText = {
  margin: '0',
  fontSize: '14px',
  color: '#111827',
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
