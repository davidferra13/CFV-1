// DailyPlanBanner — Compact summary for the dashboard.
// Shows item counts per lane and links to the Daily Ops page.

import Link from 'next/link'
import { ListChecks, ArrowRight, CheckCircle2 } from '@/components/ui/icons'

type Props = {
  stats: {
    totalItems: number
    completedItems: number
    adminItems: number
    prepItems: number
    creativeItems: number
    relationshipItems: number
    estimatedMinutes: number
  } | null
}

export function DailyPlanBanner({ stats }: Props) {
  if (!stats) return null

  const remaining = stats.totalItems - stats.completedItems

  if (remaining === 0 && stats.totalItems > 0) {
    return (
      <Link href="/daily" className="block">
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-950 px-4 py-3 hover:bg-green-900 transition-colors">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-800">Daily plan cleared. Go cook.</p>
          <ArrowRight className="h-3.5 w-3.5 text-green-400 ml-auto shrink-0" />
        </div>
      </Link>
    )
  }

  if (stats.totalItems === 0) return null

  const parts: string[] = []
  if (stats.adminItems > 0) parts.push(`${stats.adminItems} admin`)
  if (stats.prepItems > 0) parts.push(`${stats.prepItems} prep`)
  if (stats.creativeItems > 0) parts.push(`${stats.creativeItems} creative`)
  if (stats.relationshipItems > 0) parts.push(`${stats.relationshipItems} relationship`)

  return (
    <Link href="/daily" className="block">
      <div className="flex items-center justify-between rounded-lg border border-brand-700 bg-brand-950/50 px-4 py-3 hover:bg-brand-950 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <ListChecks className="h-4 w-4 text-brand-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-200">
              Daily Ops: {parts.join(' \u00B7 ')}
            </p>
            <p className="text-xs text-brand-600/70 mt-0.5">
              ~
              {stats.estimatedMinutes < 60
                ? `${stats.estimatedMinutes} min`
                : `${Math.round((stats.estimatedMinutes / 60) * 10) / 10}h`}{' '}
              estimated
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-brand-600 shrink-0 ml-4 flex items-center gap-1">
          Open <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  )
}
