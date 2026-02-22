// Seasonal Palate Sidebar — Server Component
// Shows curated seasonal produce for the currently viewed calendar month.
// Updates automatically when the chef navigates months via URL params.

import { Card, CardContent } from '@/components/ui/card'
import {
  getSeasonalProduceGrouped,
  SEASONAL_CATEGORY_CONFIG,
} from '@/lib/calendar/seasonal-produce'

type Props = { month: number }

export function SeasonalPaleteSidebar({ month }: Props) {
  const { seasonLabel, groups } = getSeasonalProduceGrouped(month)

  return (
    <Card className="sticky top-8">
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-100">
        <h3 className="font-display text-lg text-stone-900">Seasonal Palate</h3>
        <p className="text-xs text-stone-500 mt-0.5">{seasonLabel}</p>
      </div>

      {/* Category groups */}
      <CardContent className="px-5 py-4 space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
        {groups.map(({ category, label, items }) => {
          const config = SEASONAL_CATEGORY_CONFIG[category]
          return (
            <div key={category}>
              {/* Category header */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">{config.emoji}</span>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  {config.label}
                </p>
              </div>

              {/* Items as inline pills */}
              <div className="flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <span
                    key={item.name}
                    className={
                      item.peak
                        ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200'
                        : 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-stone-50 text-stone-600 ring-1 ring-inset ring-stone-200'
                    }
                    title={item.note ?? `${item.name} — ${item.peak ? 'peak season' : 'available'}`}
                  >
                    {item.name}
                    {item.peak && (
                      <span className="w-1 h-1 rounded-full bg-brand-500 flex-shrink-0" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          )
        })}

        {/* Legend */}
        <div className="pt-3 border-t border-stone-100">
          <div className="flex items-center gap-3 text-[10px] text-stone-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              Peak season
            </span>
            <span>Gray = available</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
