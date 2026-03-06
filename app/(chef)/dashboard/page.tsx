// Chef Dashboard — Suspense-streamed for instant perceived load
// The header + priority banner render immediately (~100ms).
// Schedule, alerts, and business sections stream in as they resolve.
// Protected by layout via requireChef()

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getPriorityQueue } from '@/lib/queue/actions'
import { getChefPreferences } from '@/lib/chef/actions'
import { getCachedChefArchetype } from '@/lib/chef/layout-data-cache'
import { DEFAULT_PREFERENCES, type DashboardWidgetId } from '@/lib/scheduling/types'
import { getDashboardPrimaryAction } from '@/lib/archetypes/ui-copy'
import Link from 'next/link'
import { Plus } from '@/components/ui/icons'
import type { PriorityQueue } from '@/lib/queue/types'
import {
  DashboardCollapseProvider,
  DashboardCollapseControls,
} from '@/components/dashboard/dashboard-collapse-controls'
import { DashboardQuickSettings } from '@/components/dashboard/dashboard-quick-settings'
import { NextActionCard } from '@/components/queue/next-action'
import { QueueList } from '@/components/queue/queue-list'
import { QueueSummaryBar } from '@/components/queue/queue-summary'
import { QueueEmpty } from '@/components/queue/queue-empty'
import { CollapsibleWidget } from '@/components/dashboard/collapsible-widget'
import { ArrowRight } from '@/components/ui/icons'

// Async section components (each fetches its own data)
import { ScheduleSection } from './_sections/schedule-section'
import { AlertsSection } from './_sections/alerts-section'
import { BusinessSection } from './_sections/business-section'
import { IntelligenceSection } from './_sections/intelligence-section'
import { ProactiveAlertsBar } from '@/components/intelligence/proactive-alerts-bar'

// Section skeletons for Suspense fallbacks
import {
  ScheduleSkeleton,
  AlertsSkeleton,
  QueueSkeleton,
  BusinessSkeleton,
  IntelligenceSkeleton,
} from './_sections/section-skeletons'

export const metadata: Metadata = { title: 'Dashboard - ChefFlow' }

// Safe wrapper
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

// ============================================
// DASHBOARD PAGE
// ============================================

export default async function ChefDashboard() {
  const user = await requireChef()
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = (user.email ?? '').split('@')[0].split('.')[0]

  // Only fetch what's needed for the header + priority banner (renders instantly)
  const [preferences, queue, archetype] = await Promise.all([
    safe('preferences', getChefPreferences, {
      id: '',
      chef_id: user.entityId,
      ...DEFAULT_PREFERENCES,
    }),
    safe('queue', getPriorityQueue, emptyQueue),
    safe('archetype', () => getCachedChefArchetype(user.entityId), null),
  ])
  const primaryAction = getDashboardPrimaryAction(archetype)

  const widgetPreferences = preferences.dashboard_widgets?.length
    ? preferences.dashboard_widgets
    : DEFAULT_PREFERENCES.dashboard_widgets
  const widgetEnabledRecord: Record<string, boolean> = {}
  const widgetOrderRecord: Record<string, number> = {}

  for (const [index, widget] of widgetPreferences.entries()) {
    widgetEnabledRecord[widget.id] = widget.enabled
    widgetOrderRecord[widget.id] = index
  }

  const isWidgetEnabled = (widgetId: DashboardWidgetId) => widgetEnabledRecord[widgetId] ?? true
  const getWidgetOrder = (widgetId: DashboardWidgetId) =>
    widgetOrderRecord[widgetId] ?? Number.MAX_SAFE_INTEGER

  return (
    <DashboardCollapseProvider>
      <div className="flex flex-col gap-8">
        {/* ============================================ */}
        {/* HEADER — renders instantly                   */}
        {/* ============================================ */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display text-stone-100">Dashboard</h1>
            <p className="text-sm text-stone-300 mt-0.5">
              Good {timeOfDay}
              {firstName ? `, ${firstName}` : ''}.
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <DashboardCollapseControls />
            <DashboardQuickSettings initialWidgets={widgetPreferences} />
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
        {/* PRIORITY BANNER — renders instantly          */}
        {/* ============================================ */}
        <section data-info="next-action">
          {queue.nextAction ? (
            <Link href={queue.nextAction.href} className="block">
              <div
                className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:opacity-90 ${
                  queue.nextAction.urgency === 'critical'
                    ? 'bg-red-950 border-red-200 text-red-900'
                    : queue.nextAction.urgency === 'high'
                      ? 'bg-amber-950 border-amber-200 text-amber-900'
                      : 'bg-brand-950 border-brand-700 text-brand-200'
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
                        ? ` · ${queue.nextAction.context.secondaryLabel}`
                        : ''}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium shrink-0 ml-4">Go →</span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-950 px-4 py-3">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: '#10b981' }}
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-green-800">
                All caught up — nothing urgent right now.
              </p>
            </div>
          )}
        </section>

        {/* ============================================ */}
        {/* NEXT ACTION + QUEUE — renders instantly      */}
        {/* ============================================ */}
        {isWidgetEnabled('next_action') && queue.nextAction && (
          <section style={{ order: getWidgetOrder('next_action') }}>
            <CollapsibleWidget widgetId="next_action" title="Next Action">
              <NextActionCard item={queue.nextAction} />
            </CollapsibleWidget>
          </section>
        )}

        {isWidgetEnabled('priority_queue') && (
          <section data-info="queue" style={{ order: getWidgetOrder('priority_queue') }}>
            <CollapsibleWidget widgetId="priority_queue" title="Priority Queue">
              {queue.summary.allCaughtUp ? (
                <QueueEmpty />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
                      Priority Queue ({queue.summary.totalItems})
                    </h2>
                    <Link
                      href="/queue"
                      className="text-sm text-brand-600 hover:text-brand-400 font-medium"
                    >
                      View all <ArrowRight className="h-3.5 w-3.5 inline" />
                    </Link>
                  </div>
                  <QueueSummaryBar summary={queue.summary} />
                  <QueueList items={queue.items} limit={20} showFilters={true} />
                </div>
              )}
            </CollapsibleWidget>
          </section>
        )}

        {/* ============================================ */}
        {/* SCHEDULE — streams in (~200-500ms)           */}
        {/* ============================================ */}
        <Suspense fallback={<ScheduleSkeleton />}>
          <ScheduleSection widgetEnabled={widgetEnabledRecord} widgetOrder={widgetOrderRecord} />
        </Suspense>

        {/* ============================================ */}
        {/* PROACTIVE INTELLIGENCE ALERTS                 */}
        {/* ============================================ */}
        <Suspense fallback={null}>
          <ProactiveAlertsBar />
        </Suspense>

        {/* ============================================ */}
        {/* ALERTS — streams in (~200-500ms)             */}
        {/* ============================================ */}
        <Suspense fallback={<AlertsSkeleton />}>
          <AlertsSection widgetEnabled={widgetEnabledRecord} widgetOrder={widgetOrderRecord} />
        </Suspense>

        {/* ============================================ */}
        {/* INTELLIGENCE — streams in (~500-1000ms)      */}
        {/* ============================================ */}
        <Suspense fallback={<IntelligenceSkeleton />}>
          <IntelligenceSection
            widgetEnabled={widgetEnabledRecord}
            widgetOrder={widgetOrderRecord}
          />
        </Suspense>

        {/* ============================================ */}
        {/* BUSINESS + ANALYTICS — streams in last       */}
        {/* ============================================ */}
        <Suspense fallback={<BusinessSkeleton />}>
          <BusinessSection widgetEnabled={widgetEnabledRecord} widgetOrder={widgetOrderRecord} />
        </Suspense>
      </div>
    </DashboardCollapseProvider>
  )
}
