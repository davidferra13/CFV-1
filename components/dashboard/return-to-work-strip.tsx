'use client'

import Link from 'next/link'
import { StateChangePulse, StateMotionListItem } from '@/components/ui/state-motion'
import type { ContinuityDigest } from '@/lib/activity/continuity-digest'
import type { ResumeItem } from '@/lib/activity/chef-types'
import { openRemy } from '@/lib/ai/remy-launch'

type ReturnToWorkStripProps = {
  digest: ContinuityDigest | null
  resumeItems: ResumeItem[]
  unreadNotificationCount: number | null
  digestUnavailable?: boolean
  resumeItemsUnavailable?: boolean
  unavailableLabels?: string[]
}

export function ReturnToWorkStrip({
  digest,
  resumeItems,
  unreadNotificationCount,
  digestUnavailable = false,
  resumeItemsUnavailable = false,
  unavailableLabels = [],
}: ReturnToWorkStripProps) {
  const latestSession = digest?.recentSessions[0] ?? null
  const lastHref = normalizeInternalHref(latestSession?.lastPath)
  const changedCount = digest?.activityCount ?? 0
  const topResumeItems = resumeItems.slice(0, 3)
  const hasUnavailableData = unavailableLabels.length > 0
  const shouldRender =
    hasUnavailableData ||
    Boolean(latestSession) ||
    changedCount > 0 ||
    topResumeItems.length > 0 ||
    (unreadNotificationCount ?? 0) > 0

  if (!shouldRender) return null

  return (
    <StateChangePulse
      as="section"
      watch={`${changedCount}:${topResumeItems.length}:${unreadNotificationCount ?? 'unknown'}:${hasUnavailableData ? 'partial' : 'ready'}`}
      className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Return to work
          </p>
          <h2 className="mt-1 text-lg font-semibold text-stone-100">
            Pick up with current context
          </h2>
          <p className="mt-1 text-sm text-stone-400">
            {buildSummaryLine({
              digest,
              resumeCount: resumeItems.length,
              unreadNotificationCount,
              digestUnavailable,
              resumeItemsUnavailable,
            })}
          </p>
          {hasUnavailableData && (
            <p className="mt-2 text-xs text-amber-300">
              Some return context is unavailable: {unavailableLabels.join(', ')}.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              openRemy({
                prompt: 'Catch me up since I was away',
                source: 'dashboard-return-to-work',
              })
            }
            className="inline-flex items-center rounded-lg border border-amber-700 bg-amber-950/40 px-3 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-900/50"
          >
            Ask Remy
          </button>
          <ReturnLink href="/activity#resume" label="Resume work" primary />
          <ReturnLink href="/activity?mode=retrace" label="Retrace steps" />
          <ReturnLink href="/activity" label="Open activity" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <ContextTile
          label="Last place"
          value={
            digestUnavailable
              ? 'Unavailable'
              : latestSession?.lastPath
                ? readablePath(latestSession.lastPath)
                : 'No recent path'
          }
          href={lastHref}
          cta="Open"
        />
        <ContextTile
          label="Changed"
          value={
            digestUnavailable
              ? 'Unavailable'
              : `${changedCount} tracked update${changedCount === 1 ? '' : 's'}`
          }
          href="/activity"
          cta="Review"
        />
        <ContextTile
          label="Notifications"
          value={
            unreadNotificationCount === null ? 'Unavailable' : `${unreadNotificationCount} unread`
          }
          href="/notifications"
          cta="View"
        />
      </div>

      {topResumeItems.length > 0 && (
        <div className="mt-4 border-t border-stone-800 pt-3">
          <p className="text-xs font-medium text-stone-500">Next places to resume</p>
          <div className="mt-2 grid gap-2 lg:grid-cols-3">
            {topResumeItems.map((item, index) => (
              <StateMotionListItem key={`${item.type}-${item.id}`} index={index}>
                <Link
                  href={item.href}
                  className="block rounded-lg border border-stone-800 bg-stone-900/70 px-3 py-2 transition-colors hover:border-stone-700 hover:bg-stone-900"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium text-stone-200">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-xs text-stone-500">{item.status}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-stone-500">{item.subtitle}</p>
                </Link>
              </StateMotionListItem>
            ))}
          </div>
        </div>
      )}
    </StateChangePulse>
  )
}

function buildSummaryLine({
  digest,
  resumeCount,
  unreadNotificationCount,
  digestUnavailable,
  resumeItemsUnavailable,
}: {
  digest: ContinuityDigest | null
  resumeCount: number
  unreadNotificationCount: number | null
  digestUnavailable: boolean
  resumeItemsUnavailable: boolean
}): string {
  const changed = digest?.activityCount ?? 0
  const unread = unreadNotificationCount ?? 0
  const parts = [
    resumeItemsUnavailable
      ? 'Active items unavailable'
      : `${resumeCount} active item${resumeCount === 1 ? '' : 's'}`,
    digestUnavailable
      ? 'Tracked changes unavailable'
      : `${changed} tracked change${changed === 1 ? '' : 's'}`,
  ]
  if (unreadNotificationCount !== null) {
    parts.push(`${unread} unread notification${unread === 1 ? '' : 's'}`)
  }
  return parts.join(' | ')
}

function ContextTile({
  label,
  value,
  href,
  cta,
}: {
  label: string
  value: string
  href: string
  cta: string
}) {
  return (
    <StateChangePulse watch={`${label}:${value}`} className="block">
      <Link
        href={href}
        className="block rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-3 transition-colors hover:border-stone-700 hover:bg-stone-900"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-semibold text-stone-200">{value}</p>
          <span className="shrink-0 text-xs font-medium text-amber-300">{cta}</span>
        </div>
      </Link>
    </StateChangePulse>
  )
}

function ReturnLink({
  href,
  label,
  primary = false,
}: {
  href: string
  label: string
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? 'inline-flex items-center rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500'
          : 'inline-flex items-center rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800'
      }
    >
      {label}
    </Link>
  )
}

function normalizeInternalHref(path: string | null | undefined): string {
  if (!path || !path.startsWith('/')) return '/activity'
  if (path.startsWith('//')) return '/activity'
  return path
}

function readablePath(path: string): string {
  const clean = path.split('?')[0]?.replace(/^\/+/, '') || 'dashboard'
  return clean
    .split('/')
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.replace(/-/g, ' '))
    .join(' / ')
}
