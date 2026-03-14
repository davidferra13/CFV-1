// Generic Notification Email
// Fallback template used by the channel router when a notification action
// doesn't map to a specific rich template.

import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type NotificationGenericEmailProps = {
  title: string
  body?: string | null
  actionUrl?: string | null
  actionLabel?: string
}

export function NotificationGenericEmail({
  title,
  body,
  actionUrl,
  actionLabel = 'View in ChefFlow',
}: NotificationGenericEmailProps) {
  return (
    <BaseLayout preview={title}>
      <Heading style={h1}>{title}</Heading>
      {body && <Text style={bodyText}>{body}</Text>}
      {actionUrl && (
        <Section style={{ textAlign: 'center', marginTop: '28px' }}>
          <Button href={actionUrl} style={btn}>
            {actionLabel}
          </Button>
        </Section>
      )}
    </BaseLayout>
  )
}

const h1 = {
  color: '#111827',
  fontSize: '22px',
  fontWeight: '700' as const,
  lineHeight: '1.3',
  margin: '0 0 16px',
}

const bodyText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const btn = {
  backgroundColor: '#c2410c',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '12px 28px',
  textDecoration: 'none',
}
