// StatCard — Reusable metric card for dashboards
// Adapted from legacy ChefFlow ClientDetailModal pattern

import { type LucideIcon } from 'lucide-react'

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
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  subtitle,
  className = '',
}: StatCardProps) {
  return (
    <div className={`rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-stone-400">{label}</p>
          <p className="text-2xl font-bold text-stone-100">{value}</p>
          {subtitle && <p className="text-xs text-stone-400">{subtitle}</p>}
        </div>
        <div className="rounded-lg bg-brand-950 p-2.5">
          <Icon className="h-5 w-5 text-brand-600" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={
              trend.direction === 'up'
                ? 'text-emerald-600'
                : trend.direction === 'down'
                  ? 'text-red-600'
                  : 'text-stone-400'
            }
          >
            {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
            {Math.abs(trend.value)}%
          </span>
          <span className="text-stone-400">vs last period</span>
        </div>
      )}
    </div>
  )
}
