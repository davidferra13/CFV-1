'use client'

import Link from 'next/link'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { Sparkline } from '@/components/ui/sparkline'

type HeroMetric = {
  label: string
  value: string
  href: string
  trend?: string
  trendUp?: boolean
  tier: 'hero' | 'supporting'
  sparkData?: number[]
  isSurge?: boolean
  surgeCount?: number
}

export function HeroMetricsClient({ metrics }: { metrics: HeroMetric[] }) {
  const heroMetrics = metrics.filter((metric) => metric.tier === 'hero')
  const supportingMetrics = metrics.filter((metric) => metric.tier === 'supporting')
  const surgeMetric = heroMetrics.find((m) => m.isSurge)

  // Fresh account: all metrics are zero
  const isNewAccount = metrics.every((m) => m.value === '0' || m.value === '$0')

  if (isNewAccount) {
    return (
      <div className="rounded-2xl border border-brand-800/40 bg-gradient-to-r from-brand-950/40 to-stone-900/60 p-6">
        <h2 className="text-lg font-semibold text-stone-100">Welcome to ChefFlow</h2>
        <p className="text-sm text-stone-400 mt-1 max-w-lg">
          Your dashboard fills up as you work. Start by adding your first client, creating an event,
          or setting up your embed widget to receive inquiries.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            href="/clients/new"
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-stone-700 text-sm text-stone-300 hover:bg-stone-800 transition-colors"
          >
            Add a client
          </Link>
          <Link
            href="/events/new"
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-stone-700 text-sm text-stone-300 hover:bg-stone-800 transition-colors"
          >
            Create an event
          </Link>
          <Link
            href="/settings/embed"
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-stone-700 text-sm text-stone-300 hover:bg-stone-800 transition-colors"
          >
            Set up inquiry widget
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {surgeMetric && (
        <Link
          href={surgeMetric.href}
          className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/15"
        >
          <span className="text-base">&#x26A1;</span>
          <span>Surge Mode: {surgeMetric.surgeCount} new inquiries this week. Triage now.</span>
          <span className="ml-auto text-xs text-amber-500/70">View all</span>
        </Link>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
        {heroMetrics.map((metric, i) => (
          <Link
            key={metric.label}
            href={metric.href}
            className="group relative py-1 animate-stagger-in"
            style={{ '--stagger-index': i } as React.CSSProperties}
          >
            <p className="text-xs text-stone-500 font-semibold uppercase tracking-wider">
              {metric.label}
            </p>
            <div className="flex items-end gap-3 mt-1">
              <p className="metric-display group-hover:text-brand-400 transition-colors">
                <AnimatedCounter value={metric.value} />
              </p>
              {metric.sparkData && metric.sparkData.some((v) => v > 0) && (
                <Sparkline
                  data={metric.sparkData}
                  width={72}
                  height={28}
                  color="brand"
                  className="opacity-60 group-hover:opacity-100 transition-opacity mb-1"
                />
              )}
            </div>
            {metric.trend && (
              <p
                className={`text-xxs mt-0.5 font-medium ${
                  metric.trendUp ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                }`}
              >
                {metric.trendUp && (
                  <svg
                    className="inline h-3 w-3 mr-0.5 -mt-px"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                )}
                {metric.trend}
              </p>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-brand-500/0 via-brand-500/0 to-brand-500/0 group-hover:from-brand-500/0 group-hover:via-brand-500/40 group-hover:to-brand-500/0 transition-all duration-300" />
          </Link>
        ))}
      </div>

      {supportingMetrics.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 border-t border-stone-200/70 pt-4 text-sm dark:border-stone-800/70 lg:max-w-3xl">
          {supportingMetrics.map((metric) => (
            <Link
              key={metric.label}
              href={metric.href}
              className="group flex items-baseline justify-between gap-3 rounded-xl px-1 py-1 text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-500">
                {metric.label}
              </span>
              <span className="text-base font-semibold text-current">
                <AnimatedCounter value={metric.value} />
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
