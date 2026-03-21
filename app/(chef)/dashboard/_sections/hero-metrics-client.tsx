'use client'

import Link from 'next/link'
import { AnimatedCounter } from '@/components/ui/animated-counter'

type HeroMetric = {
  label: string
  value: string
  href: string
}

export function HeroMetricsClient({ metrics }: { metrics: HeroMetric[] }) {
  return (
    <div className="col-span-1 sm:col-span-2 lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((metric, i) => (
        <Link
          key={metric.label}
          href={metric.href}
          className="group rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-3 card-lift hover:border-stone-700 hover:bg-stone-800/60"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <p className="text-xs text-stone-500 font-medium">{metric.label}</p>
          <p className="text-xl font-display text-stone-100 mt-0.5 group-hover:text-brand-400 transition-colors">
            <AnimatedCounter value={metric.value} />
          </p>
        </Link>
      ))}
    </div>
  )
}
