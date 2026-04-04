'use client'

import Link from 'next/link'
import { AnimatedCounter } from '@/components/ui/animated-counter'

type HeroMetric = {
  label: string
  value: string
  href: string
  trend?: string
  trendUp?: boolean
  tier: 'hero' | 'supporting'
}

export function HeroMetricsClient({ metrics }: { metrics: HeroMetric[] }) {
  const heroMetrics = metrics.filter((metric) => metric.tier === 'hero')
  const supportingMetrics = metrics.filter((metric) => metric.tier === 'supporting')

  return (
    <div className="space-y-5">
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
            <p className="metric-display mt-1 group-hover:text-brand-400 transition-colors">
              <AnimatedCounter value={metric.value} />
            </p>
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
