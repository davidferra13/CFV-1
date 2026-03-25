// Chef Dashboard - Daily Briefing Layout
// Structured as a morning newspaper: hero metrics up top, today's focus, then details.
// Section headers replace uniform card grid. Content breathes.

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getPriorityQueue } from '@/lib/queue/actions'
import { createServerClient } from '@/lib/supabase/server'
import { getCachedChefArchetype } from '@/lib/chef/layout-data-cache'
import { getDashboardPrimaryAction } from '@/lib/archetypes/ui-copy'
import Link from 'next/link'
import { Plus } from '@/components/ui/icons'
import type { PriorityQueue } from '@/lib/queue/types'
import { ShortcutStrip } from '@/components/dashboard/shortcut-strip'
import { ListCard, type ListCardItem } from '@/components/dashboard/widget-cards/list-card'
import { WidgetCardSkeleton } from '@/components/dashboard/widget-cards/widget-card-shell'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { AARPromptBanner } from '@/components/events/aar-prompt-banner'
import { OnboardingBanner } from '@/components/onboarding/onboarding-banner'
import UpcomingTouchpoints from '@/components/clients/upcoming-touchpoints'
import { getUpcomingTouchpoints } from '@/lib/clients/touchpoint-actions'

// New card-based sections
import { ScheduleCards } from './_sections/schedule-cards'
import { AlertCards } from './_sections/alerts-cards'
import { BusinessCards } from './_sections/business-cards'
import { IntelligenceCards } from './_sections/intelligence-cards'
import { HeroMetrics } from './_sections/hero-metrics'

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
function HeroMetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="py-2">
          <div className="h-3 w-20 loading-bone loading-bone-muted rounded" />
          <div className="h-9 w-24 loading-bone loading-bone-muted rounded mt-2" />
        </div>
      ))}
    </div>
  )
}

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

// Streamed priority queue section (deferred behind Suspense so it doesn't block TTFB)
async function PriorityQueueSection() {
  const queue = await safe('queue', getPriorityQueue, emptyQueue)

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
            ? ('brand' as const)
            : ('stone' as const),
  }))

  return (
    <>
      {/* PRIORITY BANNER */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-4">
        {queue.nextAction ? (
          <Link href={queue.nextAction.href} className="block group">
            <div
              className={`flex items-center justify-between rounded-2xl border px-5 py-4 transition-all group-hover:translate-y-[-1px] group-hover:shadow-lg ${
                queue.nextAction.urgency === 'critical'
                  ? 'bg-gradient-to-r from-red-950/80 to-red-900/30 border-red-800/50 text-red-200'
                  : queue.nextAction.urgency === 'high'
                    ? 'bg-gradient-to-r from-amber-950/80 to-amber-900/30 border-amber-800/50 text-amber-200'
                    : 'bg-gradient-to-r from-brand-950/80 to-brand-900/30 border-brand-700/50 text-brand-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
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
              <span className="text-xs font-medium shrink-0 ml-4 group-hover:translate-x-0.5 transition-transform">
                Go &rarr;
              </span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-800/30 bg-gradient-to-r from-emerald-950/40 to-emerald-950/10 px-5 py-4">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: '#10b981' }}
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-emerald-400/90">
              All caught up. Nothing urgent right now.
            </p>
          </div>
        )}
      </div>

      {/* PRIORITY QUEUE LIST */}
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
    </>
  )
}

// Streamed touchpoints section (deferred behind Suspense)
async function TouchpointsSection() {
  const touchpoints = await safe('touchpoints', getUpcomingTouchpoints, [])
  if (touchpoints.length === 0) return null
  return (
    <div className="col-span-1 sm:col-span-2">
      <UpcomingTouchpoints initialTouchpoints={touchpoints} />
    </div>
  )
}

function TouchpointsSkeleton() {
  return (
    <div className="col-span-1 sm:col-span-2">
      <WidgetCardSkeleton size="md" />
    </div>
  )
}

function PriorityQueueSkeleton() {
  return (
    <>
      <div className="col-span-1 sm:col-span-2 lg:col-span-4">
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-stone-700 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-48 loading-bone loading-bone-muted" />
              <div className="h-3 w-32 loading-bone loading-bone-muted mt-1.5" />
            </div>
          </div>
        </div>
      </div>
      <WidgetCardSkeleton size="md" />
    </>
  )
}

export default async function ChefDashboard() {
  const user = await requireChef()

  // Redirect brand-new chefs to onboarding on first login
  try {
    const supabase: any = createServerClient()
    const { count } = await supabase
      .from('onboarding_progress')
      .select('*', { count: 'exact', head: true })
      .eq('chef_id', user.tenantId!)
    if (count === 0) {
      redirect('/onboarding')
    }
  } catch (err) {
    // Next.js redirect() throws internally - re-throw it so the redirect works
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || err.message.startsWith('NEXT_'))
    ) {
      throw err
    }
    // Real DB failure: just show the dashboard rather than crashing
  }

  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = (user.email ?? '').split('@')[0].split('.')[0]

  const archetype = await safe('archetype', () => getCachedChefArchetype(user.entityId), null)
  const primaryAction = getDashboardPrimaryAction(archetype)

  // Time-aware greeting
  const greeting =
    timeOfDay === 'morning'
      ? "Here's your day at a glance."
      : timeOfDay === 'afternoon'
        ? 'Your afternoon overview.'
        : 'End-of-day summary.'

  return (
    <div className="space-y-8">
      {/* ============================================ */}
      {/* GREETING + ACTIONS                          */}
      {/* ============================================ */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <p className="text-sm text-stone-500 font-medium">
            Good {timeOfDay}
            {firstName ? `, ${firstName}` : ''}
          </p>
          <h1 className="text-3xl sm:text-4xl font-display text-stone-100 mt-1 tracking-tight">
            {greeting}
          </h1>
        </div>
        <div className="flex gap-2 items-center flex-wrap shrink-0">
          <Link
            href="/briefing"
            className="inline-flex items-center justify-center px-4 py-2.5 border border-stone-700 text-stone-300 rounded-xl hover:bg-stone-800 hover:border-stone-600 transition-all font-medium text-sm"
          >
            Briefing
          </Link>
          <Link
            href={primaryAction.href}
            data-tour="chef-dashboard-home"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 gradient-accent text-white rounded-xl font-medium text-sm glow-hover"
          >
            <Plus className="h-4 w-4" />
            {primaryAction.label}
          </Link>
        </div>
      </header>

      {/* Onboarding banner - shows until setup is complete, then auto-hides */}
      <OnboardingBanner />

      {/* ============================================ */}
      {/* HERO METRICS - Big numbers, no card wrapper  */}
      {/* ============================================ */}
      <WidgetErrorBoundary name="Hero Metrics" compact>
        <Suspense fallback={<HeroMetricsSkeleton />}>
          <HeroMetrics />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Quick navigation strip */}
      <ShortcutStrip />

      {/* ============================================ */}
      {/* FOCUS: What needs attention now              */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PRIORITY QUEUE (streamed, non-blocking) */}
        <WidgetErrorBoundary name="Priority Queue" compact>
          <Suspense fallback={<PriorityQueueSkeleton />}>
            <PriorityQueueSection />
          </Suspense>
        </WidgetErrorBoundary>

        {/* AAR PROMPT BANNER (completed events needing review) */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-4">
          <AARPromptBanner tenantId={user.tenantId!} />
        </div>

        {/* UPCOMING TOUCHPOINTS (streamed, non-blocking) */}
        <WidgetErrorBoundary name="Upcoming Touchpoints" compact>
          <Suspense fallback={<TouchpointsSkeleton />}>
            <TouchpointsSection />
          </Suspense>
        </WidgetErrorBoundary>
      </div>

      {/* ============================================ */}
      {/* SCHEDULE + OPERATIONS                        */}
      {/* ============================================ */}
      <section>
        <div className="section-label mb-4">Today &amp; This Week</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <WidgetErrorBoundary name="Schedule" compact>
            <Suspense fallback={<ScheduleCardsSkeleton />}>
              <ScheduleCards />
            </Suspense>
          </WidgetErrorBoundary>
        </div>
      </section>

      {/* ============================================ */}
      {/* ALERTS + INTELLIGENCE                        */}
      {/* ============================================ */}
      <section>
        <div className="section-label mb-4">Alerts &amp; Health</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <WidgetErrorBoundary name="Alerts" compact>
            <Suspense fallback={<AlertCardsSkeleton />}>
              <AlertCards />
            </Suspense>
          </WidgetErrorBoundary>

          <WidgetErrorBoundary name="Intelligence" compact>
            <Suspense fallback={<IntelligenceCardsSkeleton />}>
              <IntelligenceCards />
            </Suspense>
          </WidgetErrorBoundary>
        </div>
      </section>

      {/* ============================================ */}
      {/* BUSINESS METRICS                             */}
      {/* ============================================ */}
      <section>
        <div className="section-label mb-4">Business</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <WidgetErrorBoundary name="Business" compact>
            <Suspense fallback={<BusinessCardsSkeleton />}>
              <BusinessCards />
            </Suspense>
          </WidgetErrorBoundary>
        </div>
      </section>
    </div>
  )
}
