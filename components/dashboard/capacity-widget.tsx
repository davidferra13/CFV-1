// Mini Capacity Widget for the Dashboard
// Shows utilization %, burnout risk, and link to full capacity page.

import Link from 'next/link'
import { BarChart3, ArrowRight } from 'lucide-react'

interface CapacityWidgetProps {
  utilizationPercent: number
  weeklyHoursUsed: number
  weeklyHoursAvailable: number
  burnoutRisk: 'low' | 'moderate' | 'high'
  canTakeMore: boolean
  additionalEventsPerWeek: number
}

const BURNOUT_COLORS = {
  low: { bg: 'bg-green-100', text: 'text-green-700', label: 'Low' },
  moderate: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Moderate' },
  high: { bg: 'bg-red-100', text: 'text-red-700', label: 'High' },
}

export function CapacityWidget({
  utilizationPercent,
  weeklyHoursUsed,
  weeklyHoursAvailable,
  burnoutRisk,
  canTakeMore,
  additionalEventsPerWeek,
}: CapacityWidgetProps) {
  const barColor =
    utilizationPercent >= 80
      ? '#ef4444'
      : utilizationPercent >= 60
        ? '#f59e0b'
        : '#10b981'

  const burnout = BURNOUT_COLORS[burnoutRisk]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-medium text-stone-700">Capacity</span>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${burnout.bg} ${burnout.text}`}>
          {burnout.label} risk
        </span>
      </div>

      {/* Utilization bar */}
      <div>
        <div className="flex justify-between text-xs text-stone-500 mb-1">
          <span>{weeklyHoursUsed}h / {weeklyHoursAvailable}h per week</span>
          <span className="font-medium" style={{ color: barColor }}>
            {utilizationPercent}%
          </span>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, utilizationPercent)}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
      </div>

      {/* Capacity note */}
      <p className="text-xs text-stone-500">
        {canTakeMore
          ? `Room for ~${additionalEventsPerWeek} more event${additionalEventsPerWeek !== 1 ? 's' : ''} per week`
          : 'Schedule is full. Consider offloading or raising rates.'}
      </p>

      {/* Link */}
      <Link
        href="/analytics/capacity"
        className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
      >
        Full capacity analysis <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  )
}
