import { Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

type PlatformObservabilityAlertEmailProps = {
  severity: 'info' | 'important' | 'critical'
  label: string
  summary: string
  details?: string | null
  eventKey: string
  source: string
  scope: string
  occurredAt: string
  context?: Record<string, string>
}

const SEVERITY_COLORS: Record<PlatformObservabilityAlertEmailProps['severity'], string> = {
  info: '#2563eb',
  important: '#ea580c',
  critical: '#dc2626',
}

const SEVERITY_BG: Record<PlatformObservabilityAlertEmailProps['severity'], string> = {
  info: '#dbeafe',
  important: '#ffedd5',
  critical: '#fee2e2',
}

export function PlatformObservabilityAlertEmail({
  severity,
  label,
  summary,
  details,
  eventKey,
  source,
  scope,
  occurredAt,
  context,
}: PlatformObservabilityAlertEmailProps) {
  return (
    <BaseLayout preview={`[${severity.toUpperCase()}] ${label}`}>
      <Section
        style={{
          backgroundColor: SEVERITY_BG[severity],
          borderLeft: `4px solid ${SEVERITY_COLORS[severity]}`,
          borderRadius: '4px',
          padding: '12px 16px',
          marginBottom: '20px',
        }}
      >
        <Text
          style={{
            color: SEVERITY_COLORS[severity],
            fontSize: '12px',
            fontWeight: '700',
            margin: 0,
          }}
        >
          {severity.toUpperCase()}
        </Text>
      </Section>

      <Heading style={h1}>{label}</Heading>
      <Text style={meta}>
        {new Date(occurredAt).toLocaleString('en-US', { timeZone: 'America/New_York' })} EST |{' '}
        {source} | {scope} | {eventKey}
      </Text>

      <Text style={summaryText}>{summary}</Text>

      {details ? <Text style={detailsText}>{details}</Text> : null}

      {context && Object.keys(context).length > 0 ? (
        <Section style={contextBox}>
          <Text style={contextHeading}>Context</Text>
          {Object.entries(context).map(([key, value]) => (
            <Text key={key} style={contextLine}>
              <span style={{ color: '#6b7280' }}>{key}:</span> {value}
            </Text>
          ))}
        </Section>
      ) : null}
    </BaseLayout>
  )
}

const h1 = {
  color: '#111827',
  fontSize: '20px',
  fontWeight: '700' as const,
  lineHeight: '1.3',
  margin: '0 0 6px',
}

const meta = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 16px',
}

const summaryText = {
  color: '#111827',
  fontSize: '15px',
  fontWeight: '600' as const,
  margin: '0 0 16px',
}

const detailsText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap' as const,
  margin: '0 0 20px',
}

const contextBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '14px 16px',
}

const contextHeading = {
  color: '#111827',
  fontSize: '13px',
  fontWeight: '600' as const,
  margin: '0 0 8px',
}

const contextLine = {
  color: '#111827',
  fontSize: '12px',
  fontFamily: 'monospace',
  margin: '0 0 4px',
  lineHeight: '1.5',
}
