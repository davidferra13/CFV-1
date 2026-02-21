// System Health Page — Shows connection and service statuses at a glance.
// Chef can see if Stripe, Gmail, Google Calendar, and DOP tasks are healthy.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getConnectAccountStatus } from '@/lib/stripe/connect'
import { getGoogleConnection } from '@/lib/google/auth'
import { getDOPTaskDigest } from '@/lib/scheduling/task-digest'
import { getCalendarConnection } from '@/lib/scheduling/calendar-sync-actions'
import { Card } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'

export const metadata: Metadata = { title: 'System Health - ChefFlow' }

type StatusLevel = 'ok' | 'warning' | 'error' | 'unknown'

interface HealthCheck {
  label: string
  status: StatusLevel
  detail: string
  actionHref?: string
  actionLabel?: string
}

const STATUS_COLORS: Record<StatusLevel, string> = {
  ok: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  error: 'text-red-700 bg-red-50 border-red-200',
  unknown: 'text-stone-500 bg-stone-50 border-stone-200',
}

const STATUS_DOT: Record<StatusLevel, string> = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-500 animate-pulse',
  error: 'bg-red-500 animate-pulse',
  unknown: 'bg-stone-400',
}

const STATUS_LABEL: Record<StatusLevel, string> = {
  ok: 'Healthy',
  warning: 'Attention',
  error: 'Issue',
  unknown: 'Unknown',
}

function HealthRow({ check }: { check: HealthCheck }) {
  const colors = STATUS_COLORS[check.status]
  const dot = STATUS_DOT[check.status]
  const label = STATUS_LABEL[check.status]

  return (
    <div className={`flex items-center justify-between rounded-lg border p-4 ${colors}`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium text-sm">{check.label}</p>
          <p className="text-xs opacity-80 mt-0.5 truncate">{check.detail}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <span className="text-xs font-semibold">{label}</span>
        {check.actionHref && check.actionLabel && (
          <Link href={check.actionHref} className="text-xs underline hover:opacity-80">
            {check.actionLabel}
          </Link>
        )}
      </div>
    </div>
  )
}

export default async function SystemHealthPage() {
  await requireChef()

  const [stripeStatus, gmailStatus, calendarStatus, dopDigest] = await Promise.all([
    getConnectAccountStatus().catch(() => null),
    getGoogleConnection().catch(() => null),
    getCalendarConnection().catch(() => null),
    getDOPTaskDigest().catch(() => null),
  ])

  // Build health checks
  const checks: HealthCheck[] = []

  // Stripe
  if (!stripeStatus) {
    checks.push({
      label: 'Stripe Payments',
      status: 'unknown',
      detail: 'Could not check Stripe connection',
    })
  } else if (!stripeStatus.connected) {
    checks.push({
      label: 'Stripe Payments',
      status: 'error',
      detail: 'Not connected — clients cannot pay online',
      actionHref: '/settings',
      actionLabel: 'Connect Stripe →',
    })
  } else if (!stripeStatus.chargesEnabled) {
    checks.push({
      label: 'Stripe Payments',
      status: 'warning',
      detail: 'Connected but charges not yet enabled — complete Stripe onboarding',
      actionHref: '/settings',
      actionLabel: 'Fix in Settings →',
    })
  } else {
    checks.push({
      label: 'Stripe Payments',
      status: 'ok',
      detail: `Connected${stripeStatus.payoutsEnabled ? ' · Payouts enabled' : ' · Payouts pending'}`,
    })
  }

  // Gmail / Google
  if (!gmailStatus) {
    checks.push({
      label: 'Gmail Integration',
      status: 'unknown',
      detail: 'Could not check Gmail connection',
    })
  } else if (!gmailStatus.gmail.connected) {
    checks.push({
      label: 'Gmail Integration',
      status: 'warning',
      detail: 'Not connected — email scanning and AI drafts unavailable',
      actionHref: '/settings',
      actionLabel: 'Connect Gmail →',
    })
  } else if (gmailStatus.gmail.errorCount > 0) {
    checks.push({
      label: 'Gmail Integration',
      status: 'warning',
      detail: `${gmailStatus.gmail.errorCount} sync error${gmailStatus.gmail.errorCount === 1 ? '' : 's'} — check your Google connection`,
      actionHref: '/settings',
      actionLabel: 'Review →',
    })
  } else {
    const lastSync = gmailStatus.gmail.lastSync
      ? `Last synced ${formatDistanceToNow(new Date(gmailStatus.gmail.lastSync), { addSuffix: true })}`
      : 'No sync recorded yet'
    checks.push({
      label: 'Gmail Integration',
      status: 'ok',
      detail: `${gmailStatus.gmail.email ?? 'Connected'} · ${lastSync}`,
    })
  }

  // Google Calendar
  if (!calendarStatus) {
    checks.push({
      label: 'Google Calendar',
      status: 'unknown',
      detail: 'Could not check Calendar connection',
    })
  } else if (!calendarStatus.connected) {
    checks.push({
      label: 'Google Calendar',
      status: 'warning',
      detail: "Not connected — confirmed events won't sync to your calendar",
      actionHref: '/settings',
      actionLabel: 'Connect Calendar →',
    })
  } else {
    const lastSync = calendarStatus.lastSync
      ? `Last synced ${formatDistanceToNow(new Date(calendarStatus.lastSync), { addSuffix: true })}`
      : 'Connected — sync fires on event confirmation'
    checks.push({
      label: 'Google Calendar',
      status: 'ok',
      detail: `${calendarStatus.email ?? 'Connected'} · ${lastSync}`,
    })
  }

  // DOP Tasks
  if (!dopDigest) {
    checks.push({
      label: 'DOP Task Engine',
      status: 'unknown',
      detail: 'Could not load task digest',
    })
  } else if (dopDigest.overdueCount > 0) {
    checks.push({
      label: 'DOP Tasks',
      status: 'error',
      detail: `${dopDigest.overdueCount} overdue task${dopDigest.overdueCount === 1 ? '' : 's'} — action required`,
      actionHref: '/dashboard',
      actionLabel: 'View Tasks →',
    })
  } else if (dopDigest.dueTodayCount > 0) {
    checks.push({
      label: 'DOP Tasks',
      status: 'warning',
      detail: `${dopDigest.dueTodayCount} task${dopDigest.dueTodayCount === 1 ? '' : 's'} due today`,
      actionHref: '/dashboard',
      actionLabel: 'View →',
    })
  } else {
    checks.push({
      label: 'DOP Tasks',
      status: 'ok',
      detail:
        dopDigest.totalIncomplete === 0
          ? 'All tasks complete'
          : `${dopDigest.totalIncomplete} upcoming — nothing overdue`,
    })
  }

  // Overall status
  const hasError = checks.some((c) => c.status === 'error')
  const hasWarning = checks.some((c) => c.status === 'warning')
  const overallStatus: StatusLevel = hasError ? 'error' : hasWarning ? 'warning' : 'ok'
  const overallMessages: Record<StatusLevel, string> = {
    ok: 'All systems operational',
    warning: 'Some items need attention',
    error: 'One or more services have issues',
    unknown: 'Status could not be determined',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-stone-500 hover:text-stone-700">
          ← Settings
        </Link>
        <h1 className="text-3xl font-bold text-stone-900 mt-1">System Health</h1>
        <p className="text-stone-500 mt-1">
          Connection and service status for your ChefFlow account
        </p>
      </div>

      {/* Overall status banner */}
      <Card className={`p-4 border ${STATUS_COLORS[overallStatus]}`}>
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full shrink-0 ${STATUS_DOT[overallStatus]}`}
            aria-hidden="true"
          />
          <p className="font-semibold">{overallMessages[overallStatus]}</p>
        </div>
      </Card>

      {/* Individual checks */}
      <div className="space-y-3">
        {checks.map((check) => (
          <HealthRow key={check.label} check={check} />
        ))}
      </div>

      <p className="text-xs text-stone-400 text-center">
        Status refreshes on each page load. Hard-refresh to re-check all connections.
      </p>
    </div>
  )
}
