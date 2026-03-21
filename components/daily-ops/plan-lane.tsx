'use client'

// PlanLane - A single swim lane in the daily plan.
// Renders a header with time estimate and a list of items.

import { Zap, ChefHat, Palette, Users } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlanItem } from './plan-item'
import type { PlanLaneData } from '@/lib/daily-ops/types'

const LANE_ICONS: Record<string, typeof Zap> = {
  Zap,
  ChefHat,
  Palette,
  Users,
}

const LANE_COLORS: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  quick_admin: {
    border: 'border-amber-200',
    bg: 'bg-amber-950/30',
    text: 'text-amber-700',
    badge: 'bg-amber-900 text-amber-700',
  },
  event_prep: {
    border: 'border-brand-700',
    bg: 'bg-brand-950/30',
    text: 'text-brand-400',
    badge: 'bg-brand-900 text-brand-400',
  },
  creative: {
    border: 'border-purple-200',
    bg: 'bg-purple-950/30',
    text: 'text-purple-700',
    badge: 'bg-purple-900 text-purple-700',
  },
  relationship: {
    border: 'border-brand-200',
    bg: 'bg-brand-950/30',
    text: 'text-brand-700',
    badge: 'bg-brand-900 text-brand-700',
  },
}

type Props = {
  data: PlanLaneData
  onItemUpdate?: () => void
}

export function PlanLane({ data, onItemUpdate }: Props) {
  const Icon = LANE_ICONS[data.icon] ?? Zap
  const colors = LANE_COLORS[data.lane] ?? LANE_COLORS.quick_admin
  const allComplete = data.items.length > 0 && data.completedCount === data.items.length
  const activeItems = data.items.filter((i) => !i.dismissed)

  if (activeItems.length === 0) return null

  return (
    <Card className={`${colors.border} ${allComplete ? 'opacity-60' : ''}`}>
      <CardHeader className={`${colors.bg} py-3`}>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 text-sm ${colors.text}`}>
            <Icon className="h-4 w-4" />
            {data.label}
            <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${colors.badge}`}>
              {activeItems.length}
            </span>
          </CardTitle>
          {data.totalTimeMinutes > 0 && (
            <span className="text-xs text-stone-400">
              ~
              {data.totalTimeMinutes < 60
                ? `${data.totalTimeMinutes} min`
                : `${Math.round((data.totalTimeMinutes / 60) * 10) / 10}h`}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="py-3 space-y-2">
        {activeItems.map((item) => (
          <PlanItem key={item.id} item={item} onUpdate={onItemUpdate} />
        ))}
        {allComplete && (
          <p className="text-xs text-green-600 font-medium text-center py-2">All done!</p>
        )}
      </CardContent>
    </Card>
  )
}
