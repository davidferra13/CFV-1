import { Heading, Hr, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'
import type {
  PlatformDigestBreakdown,
  PlatformDigestChange,
  PlatformDigestCriticalItem,
  PlatformDigestMetric,
  PlatformObservabilityDigestSummary,
} from '@/lib/platform-observability/digest'

function renderBreakdownRows(items: PlatformDigestBreakdown[]) {
  if (items.length === 0) {
    return <Text style={emptyText}>No tracked activity in this section.</Text>
  }

  return items.map((item) => (
    <Text key={item.label} style={listItem}>
      <span style={{ fontWeight: '600' }}>{item.label}</span>: {item.count} ({item.share}%)
    </Text>
  ))
}

function renderMetricRows(items: PlatformDigestMetric[]) {
  return items.map((item) => (
    <Text key={item.label} style={listItem}>
      <span style={{ fontWeight: '600' }}>{item.label}</span>: {item.count}
    </Text>
  ))
}

function renderNotableChanges(items: PlatformDigestChange[]) {
  if (items.length === 0) {
    return <Text style={emptyText}>No significant changes versus the prior window.</Text>
  }

  return items.map((item) => (
    <Text key={item.label} style={listItem}>
      <span style={{ fontWeight: '600' }}>{item.label}</span>: {item.currentCount} vs{' '}
      {item.previousCount}
      {item.percentChange === null ? ' (new spike from zero)' : ` (${item.percentChange}% change)`}
    </Text>
  ))
}

function renderCriticalItems(items: PlatformDigestCriticalItem[]) {
  if (items.length === 0) {
    return <Text style={emptyText}>No critical events in this window.</Text>
  }

  return items.map((item, index) => (
    <Section key={`${item.label}-${index}`} style={criticalBox}>
      <Text style={criticalLabel}>{item.label}</Text>
      <Text style={criticalMeta}>
        {new Date(item.occurredAt).toLocaleString('en-US', { timeZone: 'America/New_York' })} EST |{' '}
        {item.source}
      </Text>
      <Text style={criticalSummary}>{item.summary}</Text>
    </Section>
  ))
}

export function PlatformObservabilityDigestEmail(props: PlatformObservabilityDigestSummary) {
  const issueCount = props.totals.criticalEvents + props.notableChanges.length

  return (
    <BaseLayout
      preview={`Developer Ops Digest ${props.dateLabel}${issueCount > 0 ? ' - notable changes detected' : ' - stable'}`}
    >
      <Heading style={h1}>Developer Observability Digest</Heading>
      <Text style={meta}>{props.periodLabel}</Text>

      <Section
        style={{
          backgroundColor: issueCount > 0 ? '#fef3c7' : '#dcfce7',
          borderLeft: `4px solid ${issueCount > 0 ? '#f59e0b' : '#16a34a'}`,
          borderRadius: '4px',
          padding: '12px 16px',
          marginBottom: '22px',
        }}
      >
        <Text
          style={{
            color: issueCount > 0 ? '#92400e' : '#166534',
            fontSize: '14px',
            fontWeight: '600',
            margin: 0,
          }}
        >
          {issueCount > 0
            ? `${props.totals.criticalEvents} critical event(s), ${props.notableChanges.length} notable change(s), ${props.totals.realtimeAlertsSent} real-time alert(s) sent.`
            : `Stable window with ${props.totals.totalEvents} tracked event(s) and no critical signals.`}
        </Text>
      </Section>

      <Heading style={h2}>Overview</Heading>
      {renderMetricRows([
        { label: 'Tracked events', count: props.totals.totalEvents },
        { label: 'New users', count: props.totals.newUsers },
        { label: 'Stay Updated subscriptions', count: props.totals.stayUpdatedSubscriptions },
        { label: 'Beta waitlist signups', count: props.totals.betaWaitlistSignups },
        { label: 'Authentication events', count: props.totals.authEvents },
        { label: 'Feature events', count: props.totals.featureEvents },
        { label: 'Input and conversion events', count: props.totals.conversionEvents },
        { label: 'Critical events', count: props.totals.criticalEvents },
      ])}

      <Hr style={divider} />
      <Heading style={h2}>Runtime</Heading>
      <Text style={listItem}>
        <span style={{ fontWeight: '600' }}>Environment</span>: {props.runtime.environment}
      </Text>
      <Text style={listItem}>
        <span style={{ fontWeight: '600' }}>Build surface</span>:{' '}
        {props.runtime.buildSurface ?? 'unknown'}
      </Text>
      <Text style={listItem}>
        <span style={{ fontWeight: '600' }}>Build ID</span>: {props.runtime.buildId ?? 'unknown'}
      </Text>
      <Text style={listItem}>
        <span style={{ fontWeight: '600' }}>Release</span>: {props.runtime.release ?? 'unknown'}
      </Text>
      <Text style={listItem}>
        <span style={{ fontWeight: '600' }}>App URL</span>: {props.runtime.appUrl ?? 'unknown'}
      </Text>

      <Hr style={divider} />
      <Heading style={h2}>Section Totals</Heading>
      {renderMetricRows(props.sectionMetrics)}

      <Hr style={divider} />
      <Heading style={h2}>Top Event Keys</Heading>
      {renderBreakdownRows(props.eventKeyBreakdown)}

      <Hr style={divider} />
      <Heading style={h2}>Feature Engagement</Heading>
      {renderBreakdownRows(props.featureUsage)}

      <Hr style={divider} />
      <Heading style={h2}>Traffic Patterns</Heading>
      <Text style={sectionLead}>By source</Text>
      {renderBreakdownRows(props.sourceBreakdown)}
      <Text style={sectionLead}>By path</Text>
      {renderBreakdownRows(props.pathBreakdown)}
      <Text style={sectionLead}>By actor</Text>
      {renderBreakdownRows(props.actorBreakdown)}

      <Hr style={divider} />
      <Heading style={h2}>Notable Changes</Heading>
      {renderNotableChanges(props.notableChanges)}

      <Hr style={divider} />
      <Heading style={h2}>Critical Events</Heading>
      {renderCriticalItems(props.criticalItems)}
    </BaseLayout>
  )
}

const h1 = {
  color: '#111827',
  fontSize: '22px',
  fontWeight: '700' as const,
  margin: '0 0 6px',
}

const h2 = {
  color: '#111827',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0 0 12px',
}

const meta = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0 0 18px',
}

const sectionLead = {
  color: '#374151',
  fontSize: '13px',
  fontWeight: '600' as const,
  margin: '12px 0 6px',
}

const listItem = {
  color: '#374151',
  fontSize: '14px',
  margin: '0 0 8px',
  lineHeight: '1.5',
}

const emptyText = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0 0 8px',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '18px 0',
}

const criticalBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '4px',
  padding: '10px 12px',
  marginBottom: '8px',
}

const criticalLabel = {
  color: '#111827',
  fontSize: '13px',
  fontWeight: '600' as const,
  margin: '0 0 4px',
}

const criticalMeta = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 4px',
}

const criticalSummary = {
  color: '#374151',
  fontSize: '13px',
  margin: 0,
  lineHeight: '1.5',
}
