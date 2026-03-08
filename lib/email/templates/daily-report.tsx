// Daily Report — Chef Morning Email
// Sent every morning with a full business snapshot.

import { Text, Link, Hr } from '@react-email/components'
import * as React from 'react'
import { BaseLayout, type ChefBrandProps } from './base-layout'
import type { DailyReportContent } from '@/lib/reports/types'

type Props = {
  chefName: string
  reportDate: string
  content: DailyReportContent
  reportUrl: string
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function DailyReportEmail({ chefName, reportDate, content, reportUrl }: Props) {
  const hasEvents = content.eventsToday.length > 0
  const hasHighIntent = content.highIntentVisits.length > 0
  const hasMilestones = content.upcomingMilestones.length > 0
  const hasConflicts = content.scheduleConflicts.length > 0
  const hasActions = content.nextBestActions.length > 0
  const hasDormant = content.dormantClients.length > 0
  const hasExpiringQuotes = content.expiringQuoteDetails.length > 0

  return (
    <BaseLayout brand={brand} preview={`Daily Report — ${formatDate(reportDate)}`}>
      <Text style={heading}>Good morning, {chefName}</Text>
      <Text style={subheading}>{formatDate(reportDate)}</Text>

      {/* ─── Today's Schedule ──────────────────────────────── */}
      <Text style={sectionTitle}>Today&apos;s Schedule</Text>
      {hasEvents ? (
        content.eventsToday.map((event, i) => (
          <div key={i} style={eventRow}>
            <Text style={eventTime}>{event.serveTime || 'TBD'}</Text>
            <Text style={eventDetail}>
              <strong>{event.occasion || 'Event'}</strong> — {event.clientName}
              {event.guestCount ? ` (${event.guestCount} guests)` : ''}
            </Text>
          </div>
        ))
      ) : (
        <Text style={emptyState}>No events scheduled today</Text>
      )}
      <Text style={metricSmall}>
        {content.upcomingEventsNext7d} event{content.upcomingEventsNext7d !== 1 ? 's' : ''} in the
        next 7 days
      </Text>

      <Hr style={divider} />

      {/* ─── Revenue ──────────────────────────────────────── */}
      <Text style={sectionTitle}>Revenue</Text>
      <div style={metricsGrid}>
        <div style={metricCard}>
          <Text style={metricValue}>{formatCents(content.paymentsReceivedTodayCents)}</Text>
          <Text style={metricLabel}>Today</Text>
        </div>
        <div style={metricCard}>
          <Text style={metricValue}>{formatCents(content.monthRevenueToDateCents)}</Text>
          <Text style={metricLabel}>MTD Revenue</Text>
        </div>
        <div style={metricCard}>
          <Text style={metricValue}>
            {content.monthOverMonthChangePercent > 0 ? '+' : ''}
            {content.monthOverMonthChangePercent}%
          </Text>
          <Text style={metricLabel}>vs Last Month</Text>
        </div>
      </div>
      {content.outstandingBalanceCents > 0 && (
        <Text style={warningText}>
          {formatCents(content.outstandingBalanceCents)} outstanding across unpaid events
        </Text>
      )}

      <Hr style={divider} />

      {/* ─── Pipeline ─────────────────────────────────────── */}
      <Text style={sectionTitle}>Pipeline</Text>
      <Text style={paragraph}>
        <strong>{content.newInquiriesToday}</strong> new inquir
        {content.newInquiriesToday === 1 ? 'y' : 'ies'} today ·{' '}
        <strong>{content.inquiryStats['new'] || 0}</strong> unread ·{' '}
        <strong>{content.inquiryStats['awaiting_chef'] || 0}</strong> awaiting your response
      </Text>
      {content.staleFollowUps > 0 && (
        <Text style={warningText}>
          {content.staleFollowUps} stale follow-up{content.staleFollowUps !== 1 ? 's' : ''} need
          attention
        </Text>
      )}
      {hasExpiringQuotes && (
        <Text style={warningText}>
          {content.quotesExpiringSoon} quote{content.quotesExpiringSoon !== 1 ? 's' : ''} expiring
          this week
        </Text>
      )}
      {content.pipelineForecastCents > 0 && (
        <Text style={metricSmall}>
          Pipeline forecast: {formatCents(content.pipelineForecastCents)}
        </Text>
      )}

      <Hr style={divider} />

      {/* ─── Operations ───────────────────────────────────── */}
      <Text style={sectionTitle}>Operations</Text>
      <Text style={paragraph}>
        Response time: <strong>{content.avgResponseTimeHours ?? '—'}h avg</strong>
        {content.overdueResponses > 0 && (
          <span style={{ color: '#dc2626' }}> · {content.overdueResponses} overdue (&gt;24h)</span>
        )}
      </Text>
      {content.foodCostAvgPercent !== null && (
        <Text style={paragraph}>
          Food cost: <strong>{content.foodCostAvgPercent}%</strong> avg
          {content.foodCostTrending !== 'stable' && (
            <span>
              {' '}
              ({content.foodCostTrending === 'rising' ? '↑ trending up' : '↓ trending down'})
            </span>
          )}
        </Text>
      )}
      <Text style={paragraph}>
        Closure streak: <strong>{content.closureStreak}</strong> events
        {content.longestStreak > content.closureStreak && ` (best: ${content.longestStreak})`}
      </Text>
      {content.openClosureTasks > 0 && (
        <Text style={warningText}>
          {content.openClosureTasks} event{content.openClosureTasks !== 1 ? 's' : ''} with open
          closure tasks
        </Text>
      )}

      {/* ─── Client Activity ──────────────────────────────── */}
      {(hasHighIntent || content.clientLoginsYesterday > 0) && (
        <>
          <Hr style={divider} />
          <Text style={sectionTitle}>Client Activity (Yesterday)</Text>
          <Text style={paragraph}>
            {content.clientLoginsYesterday} client login
            {content.clientLoginsYesterday !== 1 ? 's' : ''}
          </Text>
          {hasHighIntent && (
            <>
              <Text style={warningText}>High-intent signals:</Text>
              {content.highIntentVisits.map((v, i) => (
                <Text key={i} style={listItem}>
                  • <strong>{v.clientName}</strong> —{' '}
                  {v.eventType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Text>
              ))}
            </>
          )}
        </>
      )}

      {/* ─── Schedule Conflicts ───────────────────────────── */}
      {hasConflicts && (
        <>
          <Hr style={divider} />
          <Text style={sectionTitle}>Schedule Conflicts</Text>
          {content.scheduleConflicts.map((c, i) => (
            <Text key={i} style={warningText}>
              {new Date(c.date + 'T00:00:00Z').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}{' '}
              — {c.eventCount} events booked
            </Text>
          ))}
        </>
      )}

      {/* ─── Client Milestones ────────────────────────────── */}
      {hasMilestones && (
        <>
          <Hr style={divider} />
          <Text style={sectionTitle}>Upcoming Milestones</Text>
          {content.upcomingMilestones.map((m, i) => (
            <Text key={i} style={listItem}>
              • <strong>{m.clientName}</strong> — {m.label}
            </Text>
          ))}
        </>
      )}

      {/* ─── Dormant Clients ──────────────────────────────── */}
      {hasDormant && (
        <>
          <Hr style={divider} />
          <Text style={sectionTitle}>Re-engage These Clients</Text>
          {content.dormantClients.map((c, i) => (
            <Text key={i} style={listItem}>
              • <strong>{c.clientName}</strong> — {c.daysSinceLastEvent} days since last event
            </Text>
          ))}
        </>
      )}

      {/* ─── Next Best Actions ────────────────────────────── */}
      {hasActions && (
        <>
          <Hr style={divider} />
          <Text style={sectionTitle}>Action Items</Text>
          {content.nextBestActions.map((a, i) => (
            <Text key={i} style={listItem}>
              • <strong>{a.label}</strong> — {a.clientName}: {a.description}
            </Text>
          ))}
        </>
      )}

      {/* ─── CTA ──────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', margin: '32px 0 16px' }}>
        <Link
          href={reportUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#78350f',
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          View Full Report
        </Link>
      </div>

      <Text style={muted}>
        This is your daily business snapshot. View or regenerate reports in Analytics → Daily
        Report.
      </Text>
    </BaseLayout>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────

const heading = {
  fontSize: '24px',
  fontWeight: '600' as const,
  color: '#18181b',
  margin: '0 0 4px',
}
const subheading = {
  fontSize: '15px',
  color: '#6b7280',
  margin: '0 0 24px',
}
const sectionTitle = {
  fontSize: '12px',
  fontWeight: '600' as const,
  color: '#18181b',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}
const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 8px',
}
const metricSmall = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '8px 0 0',
}
const emptyState = {
  fontSize: '15px',
  color: '#9ca3af',
  fontStyle: 'italic' as const,
  margin: '0 0 8px',
}
const warningText = {
  fontSize: '14px',
  color: '#b45309',
  margin: '4px 0',
}
const listItem = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '2px 0',
}
const muted = { fontSize: '13px', color: '#9ca3af', margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '20px 0' }
const eventRow = {
  margin: '0 0 8px',
  padding: '8px 12px',
  backgroundColor: '#fefce8',
  borderRadius: '6px',
  borderLeft: '3px solid #eab308',
}
const eventTime = {
  fontSize: '12px',
  fontWeight: '600' as const,
  color: '#92400e',
  margin: '0 0 2px',
}
const eventDetail = {
  fontSize: '14px',
  color: '#374151',
  margin: '0',
}
const metricsGrid = {
  display: 'flex' as const,
  gap: '12px',
  margin: '0 0 12px',
}
const metricCard = {
  flex: '1',
  padding: '12px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  textAlign: 'center' as const,
}
const metricValue = {
  fontSize: '20px',
  fontWeight: '700' as const,
  color: '#18181b',
  margin: '0 0 2px',
}
const metricLabel = {
  fontSize: '11px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0',
}
