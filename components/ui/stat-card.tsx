// StatCard - Reusable metric card for dashboards
// Adapted from legacy ChefFlow ClientDetailModal pattern

import { type LucideIcon } from '@/components/ui/icons'
import { AnimatedCounter } from '@/components/ui/animated-counter'

type StatCardProps = {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    direction: 'up' | 'down' | 'flat'
  }
  subtitle?: string
  className?: string
  /** Animate the value counting up on first render */
  animate?: boolean
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  subtitle,
  className = '',
  animate = false,
}: StatCardProps) {
  const displayValue = String(value)

  return (
    <div
      className={`group rounded-xl border border-stone-700/60 bg-stone-900 p-5 shadow-sm transition-all duration-200 ease-out hover:border-stone-600 hover:shadow-[var(--shadow-card-hover)] hover:bg-stone-800/80 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</p>
          <p className="text-3xl font-bold text-stone-100 tabular-nums tracking-tight">
            {animate ? <AnimatedCounter value={displayValue} /> : displayValue}
          </p>
          {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="rounded-lg bg-brand-950/80 p-2.5">
          <Icon className="h-5 w-5 text-brand-500" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 font-medium ${
              trend.direction === 'up'
                ? 'text-emerald-400'
                : trend.direction === 'down'
                  ? 'text-red-400'
                  : 'text-stone-400'
            }`}
          >
            {trend.direction === 'up' && (
              <svg
                className="h-3 w-3"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9V3M6 3L3 6M6 3l3 3" />
              </svg>
            )}
            {trend.direction === 'down' && (
              <svg
                className="h-3 w-3"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 3v6M6 9l-3-3M6 9l3-3" />
              </svg>
            )}
            {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
            {Math.abs(trend.value)}%
          </span>
          <span className="text-stone-500">vs last period</span>
        </div>
      )}
    </div>
  )
}
