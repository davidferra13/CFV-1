'use client'

import Link from 'next/link'
import { AnimatedCounter } from '@/components/ui/animated-counter'

interface MetricItem {
  label: string
  value: string
  href: string
}

export function MetricsStripClient({ items }: { items: MetricItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1">
      {items.map((item, i) => (
        <Link
          key={item.label}
          href={item.href}
          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors group animate-stagger-in"
          style={{ '--stagger-index': i } as React.CSSProperties}
        >
          <span className="font-semibold text-stone-300 group-hover:text-stone-100 tabular-nums">
            <AnimatedCounter value={item.value} />
          </span>
          <span>{item.label}</span>
        </Link>
      ))}
    </div>
  )
}
