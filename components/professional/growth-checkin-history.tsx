'use client'

import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'

type Checkin = {
  id: string
  checkin_date: string
  satisfaction_score: number
  learned_this_quarter: string | null
  goal_next_quarter: string | null
}

export function GrowthCheckinHistory({ checkins }: { checkins: Checkin[] }) {
  if (checkins.length === 0) {
    return <p className="text-sm text-stone-500">No check-ins recorded yet.</p>
  }

  return (
    <div className="space-y-3">
      {checkins.map((c) => {
        const color =
          c.satisfaction_score >= 7
            ? 'text-emerald-600'
            : c.satisfaction_score >= 5
              ? 'text-amber-600'
              : 'text-red-600'
        return (
          <Card key={c.id}>
            <CardContent className="py-3">
              <div className="flex items-center gap-3 mb-1">
                <span className={`text-xl font-bold ${color}`}>{c.satisfaction_score}/10</span>
                <span className="text-xs text-stone-400">
                  {format(new Date(c.checkin_date), 'MMMM d, yyyy')}
                </span>
              </div>
              {c.learned_this_quarter && (
                <p className="text-sm text-stone-700">
                  <span className="font-medium">Learned:</span> {c.learned_this_quarter}
                </p>
              )}
              {c.goal_next_quarter && (
                <p className="text-sm text-stone-600 mt-1">
                  <span className="font-medium">Goal:</span> {c.goal_next_quarter}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
