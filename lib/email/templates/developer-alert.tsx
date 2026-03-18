// Developer Alert Email - Immediate notification for system issues
// Operational template: no marketing, no CTA, just the facts

import { Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

export type DeveloperAlertEmailProps = {
  severity: 'warning' | 'error' | 'critical'
  system: string
  title: string
  description: string
  context?: Record<string, string>
  timestamp: string
}

const SEVERITY_COLORS: Record<string, string> = {
  warning: '#f59e0b',
  error: '#ef4444',
  critical: '#dc2626',
}

const SEVERITY_BG: Record<string, string> = {
  warning: '#fef3c7',
  error: '#fee2e2',
  critical: '#fecaca',
}

export function DeveloperAlertEmail({
  severity,
  system,
  title,
  description,
  context,
  timestamp,
}: DeveloperAlertEmailProps) {
  const color = SEVERITY_COLORS[severity] || '#ef4444'
  const bg = SEVERITY_BG[severity] || '#fee2e2'

  return (
    <BaseLayout preview={`[${severity.toUpperCase()}] ${title}`}>
      <Section
        style={{
          backgroundColor: bg,
          borderLeft: `4px solid ${color}`,
          padding: '12px 16px',
          borderRadius: '4px',
          marginBottom: '24px',
        }}
      >
        <Text
          style={{
            color,
            fontSize: '13px',
            fontWeight: '700',
            margin: '0',
            textTransform: 'uppercase' as const,
          }}
        >
          {severity}
        </Text>
      </Section>

      <Heading style={h1}>{title}</Heading>

      <Text style={meta}>
        System: {system} |{' '}
        {new Date(timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' })} EST
      </Text>

      <Text style={bodyText}>{description}</Text>

      {context && Object.keys(context).length > 0 && (
        <Section style={contextBox}>
          <Text
            style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: '0 0 8px' }}
          >
            Context
          </Text>
          {Object.entries(context).map(([key, value]) => (
            <Text key={key} style={contextLine}>
              <span style={{ color: '#6b7280' }}>{key}:</span> {value}
            </Text>
          ))}
        </Section>
      )}
    </BaseLayout>
  )
}

const h1 = {
  color: '#111827',
  fontSize: '20px',
  fontWeight: '700' as const,
  lineHeight: '1.3',
  margin: '0 0 8px',
}

const meta = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0 0 20px',
}

const bodyText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 24px',
  whiteSpace: 'pre-wrap' as const,
}

const contextBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '16px',
}

const contextLine = {
  color: '#111827',
  fontSize: '13px',
  fontFamily: 'monospace',
  margin: '0 0 4px',
  lineHeight: '1.5',
}
