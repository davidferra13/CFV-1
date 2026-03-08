// Chef Dashboard - Widget Card Layout
// Real data visible at a glance. No accordions. No clicking to see info.
// Grid: 4 columns desktop, 2 tablet, 1 mobile.
// Each widget is an always-visible card showing its key metric immediately.

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getPriorityQueue } from '@/lib/queue/actions'
import { getCachedChefArchetype } from '@/lib/chef/layout-data-cache'
import { getDashboardPrimaryAction } from '@/lib/archetypes/ui-copy'
import Link from 'next/link'
import { Plus } from '@/components/ui/icons'
import type { PriorityQueue } from '@/lib/queue/types'
import { ShortcutStrip } from '@/components/dashboard/shortcut-strip'
import { ListCard, type ListCardItem } from '@/components/dashboard/widget-cards/list-card'
import { WidgetCardSkeleton } from '@/components/dashboard/widget-cards/widget-card-shell'

// New card-based sections
import { ScheduleCards } from './_sections/schedule-cards'
import { AlertCards } from './_sections/alerts-cards'
import { BusinessCards } from './_sections/business-cards'
import { IntelligenceCards } from './_sections/intelligence-cards'

export const metadata: Metadata = { title: 'Dashboard - ChefFlow' }

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard] ${label} failed:`, err)
    return fallback
  }
}

const emptyQueue: PriorityQueue = {
  items: [],
  nextAction: null,
  summary: {
    totalItems: 0,
    byDomain: {
      inquiry: 0,
      message: 0,
      quote: 0,
      event: 0,
      financial: 0,
      post_event: 0,
      client: 0,
      culinary: 0,
    },
    byUrgency: { critical: 0, high: 0, normal: 0, low: 0 },
    allCaughtUp: true,
  },
  computedAt: new Date().toISOString(),
}

// Section loading skeletons
function ScheduleCardsSkeleton() {
  return (
    <>
      <WidgetCardSkeleton size="md" />
      <WidgetCardSkeleton size="md" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
    </>
  )
}

function AlertCardsSkeleton() {
  return (
    <>
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
    </>
  )
}

function BusinessCardsSkeleton() {
  return (
    <>
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
      <WidgetCardSkeleton size="sm" />
    </>
  )
}

function IntelligenceCardsSkeleton() {
  return <WidgetCardSkeleton size="md" />
}

export default async function ChefDashboard() {
  const user = await requireChef()
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = (user.email ?? '').split('@')[0].split('.')[0]

  const [queue, archetype] = await Promise.all([
    safe('queue', getPriorityQueue, emptyQueue),
    safe('archetype', () => getCachedChefArchetype(user.entityId), null),
  ])
  const primaryAction = getDashboardPrimaryAction(archetype)

  // Build priority queue items for the list card
  const queueItems: ListCardItem[] = queue.items.slice(0, 5).map((item) => ({
    id: item.id,
    label: item.title,
    sublabel:
      item.context.primaryLabel +
      (item.context.secondaryLabel ? ` - ${item.context.secondaryLabel}` : ''),
    href: item.href,
    status:
      item.urgency === 'critical'
        ? ('red' as const)
        : item.urgency === 'high'
          ? ('amber' as const)
          : item.urgency === 'normal'
            ? ('blue' as const)
            : ('stone' as const),
  }))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* ============================================ */}
      {/* HEADER                                       */}
      {/* ============================================ */}
      <div
        data-tour="dashboard-header"
        className="col-span-1 sm:col-span-2 lg:col-span-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-stone-100">Dashboard</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Good {timeOfDay}
            {firstName ? `, ${firstName}` : ''}.
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Link
            href="/briefing"
            className="inline-flex items-center justify-center px-4 py-2 border border-brand-600 text-brand-400 rounded-lg hover:bg-brand-950 transition-colors font-medium text-sm"
          >
            Briefing
          </Link>
          <Link
            href="/queue"
            className="inline-flex items-center justify-center px-4 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            Full Queue
          </Link>
          <Link
            href={primaryAction.href}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            {primaryAction.label}
          </Link>
        </div>
      </div>

      {/* ============================================ */}
      {/* SHORTCUT STRIP                               */}
      {/* ============================================ */}
      <ShortcutStrip />

      {/* ============================================ */}
      {/* PRIORITY BANNER                              */}
      {/* ============================================ */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-4">
        {queue.nextAction ? (
          <Link href={queue.nextAction.href} className="block">
            <div
              className={`flex items-center justify-between rounded-2xl border px-5 py-4 transition-colors hover:opacity-90 ${
                queue.nextAction.urgency === 'critical'
                  ? 'bg-gradient-to-r from-red-950/80 to-red-900/30 border-red-800/50 text-red-200'
                  : queue.nextAction.urgency === 'high'
                    ? 'bg-gradient-to-r from-amber-950/80 to-amber-900/30 border-amber-800/50 text-amber-200'
                    : 'bg-gradient-to-r from-brand-950/80 to-brand-900/30 border-brand-700/50 text-brand-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      queue.nextAction.urgency === 'critical'
                        ? '#ef4444'
                        : queue.nextAction.urgency === 'high'
                          ? '#f59e0b'
                          : '#e88f47',
                  }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{queue.nextAction.title}</p>
                  <p className="text-xs opacity-75 mt-0.5 truncate">
                    {queue.nextAction.context.primaryLabel}
                    {queue.nextAction.context.secondaryLabel
                      ? ` - ${queue.nextAction.context.secondaryLabel}`
                      : ''}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium shrink-0 ml-4">Go &rarr;</span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-green-800/40 bg-gradient-to-r from-green-950/60 to-emerald-950/30 px-5 py-4">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
              style={{ backgroundColor: '#10b981' }}
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-green-300">
              All caught up. Nothing urgent right now.
            </p>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* PRIORITY QUEUE - list card                   */}
      {/* ============================================ */}
      {!queue.summary.allCaughtUp && (
        <ListCard
          widgetId="priority_queue"
          title="Priority Queue"
          count={queue.summary.totalItems}
          items={queueItems}
          href="/queue"
          emptyMessage="All caught up!"
        />
      )}

      {/* ============================================ */}
      {/* SCHEDULE CARDS (streamed)                    */}
      {/* ============================================ */}
      <Suspense fallback={<ScheduleCardsSkeleton />}>
        <ScheduleCards />
      </Suspense>

      {/* ============================================ */}
      {/* INTELLIGENCE CARDS (streamed)                */}
      {/* ============================================ */}
      <Suspense fallback={<IntelligenceCardsSkeleton />}>
        <IntelligenceCards />
      </Suspense>

      {/* ============================================ */}
      {/* ALERT CARDS (streamed)                       */}
      {/* ============================================ */}
      <Suspense fallback={<AlertCardsSkeleton />}>
        <AlertCards />
      </Suspense>

      {/* ============================================ */}
      {/* BUSINESS CARDS (streamed - heaviest)         */}
      {/* ============================================ */}
      <Suspense fallback={<BusinessCardsSkeleton />}>
        <BusinessCards />
      </Suspense>
    </div>
  )
}
