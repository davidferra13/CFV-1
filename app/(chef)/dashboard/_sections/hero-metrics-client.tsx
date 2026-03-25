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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
      {metrics.map((metric, i) => (
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
          {/* Subtle bottom accent on hover */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-brand-500/0 via-brand-500/0 to-brand-500/0 group-hover:from-brand-500/0 group-hover:via-brand-500/40 group-hover:to-brand-500/0 transition-all duration-300" />
        </Link>
      ))}
    </div>
  )
}
