import { Link, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type ContactMessageReceivedEmailProps = {
  contactName: string
  supportEmail: string
  responseWindowText: string
}

export function ContactMessageReceivedEmail({
  contactName,
  supportEmail,
  responseWindowText,
}: ContactMessageReceivedEmailProps) {
  return (
    <BaseLayout preview="We received your message">
      <Text style={heading}>Message received</Text>
      <Text style={paragraph}>Hi {contactName},</Text>
      <Text style={paragraph}>
        Thank you for contacting ChefFlow. We received your message and our team will reply{' '}
        <strong>{responseWindowText}</strong>.
      </Text>
      <Text style={paragraph}>
        If you need to add more detail, simply reply to this email or write to{' '}
        <Link href={`mailto:${supportEmail}`} style={linkStyle}>
          {supportEmail}
        </Link>
        .
      </Text>
      <Text style={footer}>We appreciate your patience and will follow up as soon as we can.</Text>
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

const linkStyle = {
  color: '#2563eb',
  textDecoration: 'underline',
}

const footer = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#6b7280',
  margin: '0',
}
