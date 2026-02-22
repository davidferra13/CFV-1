'use client'

// PlanLane — A single swim lane in the daily plan.
// Renders a header with time estimate and a list of items.

import { Zap, ChefHat, Palette, Users } from 'lucide-react'
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
    bg: 'bg-amber-50/30',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
  },
  event_prep: {
    border: 'border-brand-200',
    bg: 'bg-brand-50/30',
    text: 'text-brand-700',
    badge: 'bg-brand-100 text-brand-700',
  },
  creative: {
    border: 'border-purple-200',
    bg: 'bg-purple-50/30',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-700',
  },
  relationship: {
    border: 'border-sky-200',
    bg: 'bg-sky-50/30',
    text: 'text-sky-700',
    badge: 'bg-sky-100 text-sky-700',
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
