'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DietaryRollup } from '@/lib/beta/onboarding-actions'

interface DietaryRollupCardProps {
  rollup: DietaryRollup
}

export function DietaryRollupCard({ rollup }: DietaryRollupCardProps) {
  if (rollup.restrictions.length === 0 && rollup.allergies.length === 0) {
    return (
      <Card className="border-stone-700 bg-stone-900/60">
        <CardContent className="p-4">
          <h4 className="mb-2 text-sm font-medium text-stone-300">Dietary Summary</h4>
          <p className="text-xs text-stone-500">
            No dietary restrictions or allergies on file for this guest list.
            {rollup.guestsWithInfo === 0 && rollup.totalGuests > 0 && (
              <span> ({rollup.totalGuests} guests have not submitted their preferences yet.)</span>
            )}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-stone-700 bg-stone-900/60">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium text-stone-300">Dietary Summary</h4>
          <span className="text-xs text-stone-500">
            {rollup.guestsWithInfo} of {rollup.totalGuests} guests have shared info
          </span>
        </div>

        {rollup.allergies.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-red-400">
              Allergies
            </p>
            <div className="flex flex-wrap gap-1.5">
              {rollup.allergies.map((a) => (
                <Badge key={a.label} variant="error">
                  {a.label} ({a.count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {rollup.restrictions.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-amber-400">
              Dietary Restrictions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {rollup.restrictions.map((r) => (
                <Badge key={r.label} variant="warning">
                  {r.label} ({r.count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
