'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from '@/components/ui/icons'

type Snapshot = {
  new_clients_90d: number
  education_entries_12m: number
  creative_projects_90d: number
  avg_satisfaction_90d: number | null
  momentum_direction: string
}

const DIRECTION_CONFIG: Record<
  string,
  { label: string; icon: typeof TrendingUp; variant: 'success' | 'warning' | 'error' }
> = {
  growing: { label: 'Growing', icon: TrendingUp, variant: 'success' },
  maintaining: { label: 'Maintaining', icon: Minus, variant: 'warning' },
  stagnating: { label: 'Stagnating', icon: TrendingDown, variant: 'error' },
}

export function MomentumDashboard({ snapshot }: { snapshot: Snapshot | null }) {
  if (!snapshot) {
    return (
      <p className="text-sm text-stone-500">
        No momentum data yet. Check back after your first quarter of activity.
      </p>
    )
  }

  const dir = DIRECTION_CONFIG[snapshot.momentum_direction] ?? DIRECTION_CONFIG.maintaining
  const DirIcon = dir.icon

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <DirIcon className="w-5 h-5" />
        <Badge variant={dir.variant}>{dir.label}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-stone-500">New Clients (90d)</p>
            <p className="text-2xl font-bold text-stone-100 mt-1">{snapshot.new_clients_90d}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-stone-500">Education (12m)</p>
            <p className="text-2xl font-bold text-stone-100 mt-1">
              {snapshot.education_entries_12m}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-stone-500">Creative Projects (90d)</p>
            <p className="text-2xl font-bold text-stone-100 mt-1">
              {snapshot.creative_projects_90d}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-stone-500">Satisfaction</p>
            <p className="text-2xl font-bold text-stone-100 mt-1">
              {snapshot.avg_satisfaction_90d !== null
                ? `${Number(snapshot.avg_satisfaction_90d).toFixed(1)}/10`
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {snapshot.momentum_direction === 'stagnating' && (
        <Card>
          <CardContent className="py-4 space-y-2">
            <p className="text-sm font-medium text-stone-200">
              Things have been steady for a while. Here are some ways to push forward:
            </p>
            <ul className="text-sm text-stone-400 space-y-1.5 list-disc list-inside">
              {snapshot.creative_projects_90d === 0 && (
                <li>Cook something just for yourself this week (no client, no deadline)</li>
              )}
              {snapshot.education_entries_12m < 2 && (
                <li>Log a continuing education activity (class, book, technique practice)</li>
              )}
              <li>Add a new dish to your recipe library outside your usual range</li>
              <li>Try a cuisine you have not worked with before</li>
              {snapshot.avg_satisfaction_90d !== null && snapshot.avg_satisfaction_90d < 5 && (
                <li>
                  Your satisfaction is low. Consider what needs to change, and talk to someone you
                  trust about it.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
