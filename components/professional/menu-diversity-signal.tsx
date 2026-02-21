'use client'

import type { MenuDiversitySignal } from '@/lib/professional/menu-diversity'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const LEVEL_VARIANTS: Record<string, 'success' | 'warning' | 'error'> = {
  high: 'success',
  moderate: 'warning',
  low: 'error',
}

export function MenuDiversitySignalCard({ signal }: { signal: MenuDiversitySignal | null }) {
  if (!signal || signal.totalServingsLast90d === 0) return null

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-stone-700">Menu Diversity</p>
          <Badge variant={LEVEL_VARIANTS[signal.diversityLevel] ?? 'default'}>
            {signal.diversityLevel}
          </Badge>
        </div>
        <p className="text-xs text-stone-500">
          {signal.uniqueDishesLast90d} unique dishes across {signal.totalServingsLast90d} servings
        </p>
        {signal.topRepeatedDishes.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-stone-400 mb-1">Most repeated:</p>
            {signal.topRepeatedDishes.slice(0, 3).map((d) => (
              <p key={d.name} className="text-xs text-stone-600">
                {d.name} ({d.count}x)
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
