// Lifecycle Status Update Email Template
// Sent to clients at each major stage transition.

import { Text, Link, Section, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type LifecycleStatusUpdateProps = {
  clientName: string
  chefName: string
  stageLabel: string
  stageMessage: string
  nextStep: string
  portalUrl?: string
}

export function LifecycleStatusUpdate({
  clientName,
  chefName,
  stageLabel,
  stageMessage,
  nextStep,
  portalUrl,
}: LifecycleStatusUpdateProps) {
  return (
    <BaseLayout preview={`${stageLabel} - Update from ${chefName}`}>
      <Text style={greeting}>Hi {clientName.split(' ')[0]},</Text>

      <Text style={body}>{stageMessage}</Text>

      <Section style={statusBox}>
        <Text style={statusLabel}>Current Status</Text>
        <Text style={statusValue}>{stageLabel}</Text>
      </Section>

      <Text style={body}>
        <strong>What happens next:</strong> {nextStep}
      </Text>

      {portalUrl && (
        <>
          <Hr style={divider} />
          <Text style={body}>You can check your full event status anytime:</Text>
          <Link href={portalUrl} style={ctaLink}>
            View Your Event Portal
          </Link>
        </>
      )}

      <Hr style={divider} />
      <Text style={signoff}>{chefName}</Text>
    </BaseLayout>
  )
}

export default LifecycleStatusUpdate

// Styles
const greeting = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#1a1a1a',
  margin: '0 0 16px 0',
}

const body = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#333333',
  margin: '0 0 16px 0',
}

const statusBox = {
  backgroundColor: '#f0f7ff',
  border: '1px solid #cce0ff',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const statusLabel = {
  fontSize: '12px',
  color: '#666666',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const statusValue = {
  fontSize: '18px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  margin: '0',
}

const divider = {
  borderColor: '#eeeeee',
  margin: '24px 0',
}

const ctaLink = {
  display: 'inline-block',
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '500' as const,
}

const signoff = {
  fontSize: '15px',
  color: '#333333',
  margin: '16px 0 0 0',
}
