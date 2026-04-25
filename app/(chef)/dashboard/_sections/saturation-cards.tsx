// Dashboard Saturation Cards - shows workload saturation %
// Follows the same pattern as schedule-cards.tsx

import { getSaturationSnapshot } from '@/lib/saturation/actions'
import { StatCard } from '@/components/dashboard/widget-cards/stat-card'
import { WidgetCardShell } from '@/components/dashboard/widget-cards/widget-card-shell'
import type { SaturationSnapshot } from '@/lib/saturation/types'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/SaturationCards] ${label} failed:`, err)
    return fallback
  }
}

const STATUS_COLORS: Record<SaturationSnapshot['status'], string> = {
  low: 'text-green-400',
  moderate: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
}

const STATUS_LABELS: Record<SaturationSnapshot['status'], string> = {
  low: 'Light',
  moderate: 'Moderate',
  high: 'Busy',
  critical: 'Near Capacity',
}

export async function SaturationCards() {
  const snapshot = await safe('saturation', () => getSaturationSnapshot('week'), null)

  if (!snapshot) return null

  const { overall, dimensions, periodLabel, status, warnings } = snapshot

  return (
    <>
      <StatCard
        widgetId="saturation-overall"
        title="Workload"
        value={`${overall}%`}
        subtitle={periodLabel}
        trend={STATUS_LABELS[status]}
        trendDirection={overall >= 65 ? 'down' : overall >= 35 ? 'flat' : 'up'}
        href="/scheduling"
      />
      <WidgetCardShell widgetId="saturation-breakdown" title="Capacity" size="md">
        <div className="space-y-2 text-sm">
          {([dimensions.time, dimensions.events, dimensions.guests] as const).map((dim) => (
            <div key={dim.label} className="flex items-center gap-2">
              <span className="w-16 text-stone-400 shrink-0">{dim.label}</span>
              <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    dim.percent >= 85
                      ? 'bg-red-500'
                      : dim.percent >= 65
                        ? 'bg-orange-500'
                        : dim.percent >= 35
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                  }`}
                  style={{ width: `${dim.percent}%` }}
                />
              </div>
              <span className="w-12 text-right text-stone-300 tabular-nums">
                {dim.current}/{dim.max}
              </span>
            </div>
          ))}
          {warnings.length > 0 && <p className="text-xs text-amber-400 mt-1">{warnings[0]}</p>}
        </div>
      </WidgetCardShell>
    </>
  )
}
