import { Text, Button } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type IncentiveDeliveryEmailProps = {
  recipientName?: string | null
  senderName: string
  incentiveType: 'voucher' | 'gift_card'
  title: string
  code: string
  valueLabel: string
  expiresAt?: string | null
  personalMessage?: string | null
  /** Chef slug for direct profile link */
  chefSlug?: string | null
  /** Chef display name */
  chefName?: string | null
}

function formatTypeLabel(type: 'voucher' | 'gift_card') {
  return type === 'gift_card' ? 'Gift Card' : 'Voucher'
}

export function IncentiveDeliveryEmail({
  recipientName,
  senderName,
  incentiveType,
  title,
  code,
  valueLabel,
  expiresAt,
  personalMessage,
  chefSlug,
  chefName,
}: IncentiveDeliveryEmailProps) {
  return (
    <BaseLayout preview={`${senderName} sent you a ${formatTypeLabel(incentiveType)}`}>
      <Text style={heading}>You received a {formatTypeLabel(incentiveType)}</Text>

      <Text style={paragraph}>Hi {recipientName?.trim() || 'there'},</Text>

      <Text style={paragraph}>
        <strong>{senderName}</strong> sent you <strong>{title}</strong>.
      </Text>

      <div style={codeCard}>
        <Text style={codeLabel}>Code</Text>
        <Text style={codeValue}>{code}</Text>
        <Text style={valueText}>{valueLabel}</Text>
        {expiresAt ? <Text style={expiresText}>Expires: {expiresAt}</Text> : null}
      </div>

      {personalMessage ? (
        <div style={messageCard}>
          <Text style={messageLabel}>Message</Text>
          <Text style={messageValue}>{personalMessage}</Text>
        </div>
      ) : null}

      <Text style={muted}>Keep this email for your records and share the code when redeeming.</Text>

      <div style={ctaSection}>
        {chefSlug ? (
          <Button href={`${SITE_URL}/chef/${chefSlug}/inquire`} style={ctaButton}>
            Book {chefName ? `with ${chefName}` : 'a Private Chef'}
          </Button>
        ) : (
          <Button href={`${SITE_URL}/chefs`} style={ctaButton}>
            Browse Chefs on ChefFlow
          </Button>
        )}
      </div>
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
  backgroundColor: '#f9fafb',
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
  margin: '0 0 4px',
  fontSize: '14px',
  color: '#111827',
}

const expiresText = {
  margin: '0',
  fontSize: '13px',
  color: '#6b7280',
}

const messageCard = {
  borderLeft: '3px solid #d1d5db',
  paddingLeft: '12px',
  margin: '0 0 20px',
}

const messageLabel = {
  margin: '0 0 4px',
  fontSize: '12px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
}

const messageValue = {
  margin: '0',
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#374151',
  whiteSpace: 'pre-wrap' as const,
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0 0',
}

const ctaButton = {
  backgroundColor: '#e88f47',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block' as const,
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  textDecoration: 'none',
  textAlign: 'center' as const,
}

const muted = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
}
