// Developer Daily Digest Email - System health summary
// Sent once daily at 7 AM EST. Only includes sections with issues.

import { Heading, Hr, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

export type CronHealthEntry = {
  name: string
  status: 'ok' | 'stale' | 'missing' | 'error'
  lastRunAt: string | null
  minutesSince: number | null
}

export type CircuitEntry = {
  name: string
  state: string
  failures: number
}

export type RecentError = {
  cronName: string
  errorText: string
  time: string
}

export type DeveloperDigestEmailProps = {
  date: string
  cronHealth: CronHealthEntry[]
  circuits: CircuitEntry[]
  recentErrors: RecentError[]
  ollamaStatus: { online: boolean; latencyMs?: number }
  overallHealthy: boolean
}

const STATUS_ICON: Record<string, string> = {
  ok: 'OK',
  stale: 'STALE',
  missing: 'MISSING',
  error: 'ERROR',
}

const STATUS_COLOR: Record<string, string> = {
  ok: '#16a34a',
  stale: '#f59e0b',
  missing: '#9ca3af',
  error: '#ef4444',
}

export function DeveloperDigestEmail({
  date,
  cronHealth,
  circuits,
  recentErrors,
  ollamaStatus,
  overallHealthy,
}: DeveloperDigestEmailProps) {
  const unhealthyCrons = cronHealth.filter((c) => c.status !== 'ok')
  const openCircuits = circuits.filter((c) => c.state !== 'CLOSED')
  const hasIssues = !overallHealthy

  return (
    <BaseLayout
      preview={`Daily Digest ${date}${hasIssues ? ' - Issues detected' : ' - All healthy'}`}
    >
      <Heading style={h1}>System Health Digest</Heading>
      <Text style={dateLine}>{date}</Text>

      {/* Overall status banner */}
      <Section
        style={{
          backgroundColor: hasIssues ? '#fef3c7' : '#dcfce7',
          borderLeft: `4px solid ${hasIssues ? '#f59e0b' : '#16a34a'}`,
          padding: '12px 16px',
          borderRadius: '4px',
          marginBottom: '24px',
        }}
      >
        <Text
          style={{
            color: hasIssues ? '#92400e' : '#166534',
            fontSize: '14px',
            fontWeight: '600',
            margin: '0',
          }}
        >
          {hasIssues
            ? `Issues detected: ${unhealthyCrons.length} cron(s), ${openCircuits.length} circuit(s), ${recentErrors.length} error(s)`
            : 'All systems healthy. No issues in the last 24 hours.'}
        </Text>
      </Section>

      {/* Cron Health (only show if issues exist) */}
      {unhealthyCrons.length > 0 && (
        <>
          <Heading style={h2}>Cron Jobs</Heading>
          {unhealthyCrons.map((cron) => (
            <Text key={cron.name} style={listItem}>
              <span style={{ color: STATUS_COLOR[cron.status] || '#6b7280', fontWeight: '600' }}>
                [{STATUS_ICON[cron.status] || cron.status}]
              </span>{' '}
              {cron.name}
              {cron.minutesSince !== null
                ? ` (last ran ${cron.minutesSince}m ago)`
                : ' (never ran)'}
            </Text>
          ))}
          <Text style={summaryLine}>
            {cronHealth.filter((c) => c.status === 'ok').length}/{cronHealth.length} crons healthy
          </Text>
          <Hr style={divider} />
        </>
      )}

      {/* Circuit Breakers (only show if any non-CLOSED) */}
      {openCircuits.length > 0 && (
        <>
          <Heading style={h2}>Circuit Breakers</Heading>
          {openCircuits.map((cb) => (
            <Text key={cb.name} style={listItem}>
              <span style={{ color: '#ef4444', fontWeight: '600' }}>[{cb.state}]</span> {cb.name} (
              {cb.failures} failures)
            </Text>
          ))}
          <Hr style={divider} />
        </>
      )}

      {/* Recent Errors */}
      {recentErrors.length > 0 && (
        <>
          <Heading style={h2}>Recent Errors (24h)</Heading>
          {recentErrors.slice(0, 10).map((err, i) => (
            <Section key={i} style={errorBox}>
              <Text
                style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}
              >
                {err.cronName}
              </Text>
              <Text style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }}>
                {new Date(err.time).toLocaleString('en-US', { timeZone: 'America/New_York' })}
              </Text>
              <Text
                style={{ fontSize: '12px', color: '#374151', margin: '0', fontFamily: 'monospace' }}
              >
                {err.errorText.slice(0, 200)}
              </Text>
            </Section>
          ))}
          {recentErrors.length > 10 && (
            <Text style={summaryLine}>...and {recentErrors.length - 10} more errors</Text>
          )}
          <Hr style={divider} />
        </>
      )}

      {/* Ollama Status */}
      <Heading style={h2}>Ollama</Heading>
      <Text style={listItem}>
        <span style={{ color: ollamaStatus.online ? '#16a34a' : '#ef4444', fontWeight: '600' }}>
          [{ollamaStatus.online ? 'ONLINE' : 'OFFLINE'}]
        </span>{' '}
        {ollamaStatus.online
          ? `Responding (${ollamaStatus.latencyMs ?? '?'}ms latency)`
          : 'Not responding on localhost:11434'}
      </Text>

      {/* All-healthy cron summary (collapsed) */}
      {unhealthyCrons.length === 0 && (
        <Text style={summaryLine}>All {cronHealth.length} cron jobs ran on schedule.</Text>
      )}
    </BaseLayout>
  )
}

const h1 = {
  color: '#111827',
  fontSize: '22px',
  fontWeight: '700' as const,
  lineHeight: '1.3',
  margin: '0 0 4px',
}

const h2 = {
  color: '#111827',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
}

const dateLine = {
  color: '#9ca3af',
  fontSize: '13px',
  margin: '0 0 20px',
}

const listItem = {
  color: '#374151',
  fontSize: '14px',
  margin: '0 0 8px',
  lineHeight: '1.5',
}

const summaryLine = {
  color: '#9ca3af',
  fontSize: '13px',
  fontStyle: 'italic' as const,
  margin: '8px 0 0',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const errorBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '4px',
  padding: '10px 12px',
  marginBottom: '8px',
}
