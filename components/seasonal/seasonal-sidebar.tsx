// Seasonal Sidebar - Schedule Integration
// Shows the active season's notes, available ingredients, and go-to dishes.

import type { SeasonalPalette } from '@/lib/seasonal/types'
import { getActiveMicroWindows, getEndingMicroWindows } from '@/lib/seasonal/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const SEASON_ACCENT: Record<string, string> = {
  Winter: 'border-l-brand-400',
  Spring: 'border-l-emerald-400',
  Summer: 'border-l-amber-400',
  Autumn: 'border-l-orange-400',
}

export function SeasonalSidebar({ palette }: { palette: SeasonalPalette }) {
  const activeMicroWindows = getActiveMicroWindows(palette)
  const endingMicroWindows = getEndingMicroWindows(palette)
  const accentClass = SEASON_ACCENT[palette.season_name] || 'border-l-stone-400'

  const isEmpty =
    !palette.sensory_anchor &&
    palette.micro_windows.length === 0 &&
    palette.proven_wins.length === 0

  return (
    <div className={`space-y-4 border-l-4 ${accentClass} pl-4`}>
      {/* Season Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-stone-100">
              {palette.season_name} ({formatRange(palette.start_month_day, palette.end_month_day)})
            </h3>
            <Link
              href={`/settings/repertoire/${palette.id}`}
              className="text-xs text-brand-500 hover:text-brand-400"
            >
              Edit
            </Link>
          </div>
          {palette.sensory_anchor ? (
            <p className="text-sm text-stone-400 mt-2">{palette.sensory_anchor}</p>
          ) : (
            <p className="text-sm text-stone-400 mt-2">
              No notes yet.{' '}
              <Link
                href={`/settings/repertoire/${palette.id}`}
                className="text-brand-500 hover:text-brand-400"
              >
                Add notes
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Empty state */}
      {isEmpty && (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-stone-500 mb-2">
              Your {palette.season_name} palette is empty.
            </p>
            <p className="text-xs text-stone-400">
              Add notes, seasonal ingredients, and go-to dishes to build your reference.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Seasonal Ingredients */}
      {(activeMicroWindows.length > 0 || endingMicroWindows.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">What&apos;s In Season</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {activeMicroWindows.map((w, i) => {
              const isEnding = endingMicroWindows.some((e) => e.ingredient === w.ingredient)
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-sm p-2 rounded-lg ${
                    isEnding ? 'bg-amber-950 border border-amber-100' : 'bg-stone-800'
                  }`}
                >
                  <div className="flex-1">
                    <span className="font-medium text-stone-100">{w.ingredient}</span>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {w.start_date} to {w.end_date}
                      {isEnding && (
                        <span className="text-amber-600 font-medium"> &mdash; ending soon</span>
                      )}
                    </p>
                    {w.notes && <p className="text-xs text-stone-400 mt-0.5">{w.notes}</p>}
                  </div>
                </div>
              )
            })}
            {/* Show ending-only not already shown */}
            {endingMicroWindows
              .filter((e) => !activeMicroWindows.some((a) => a.ingredient === e.ingredient))
              .map((w, i) => (
                <div
                  key={`ending-${i}`}
                  className="flex items-start gap-2 text-sm p-2 rounded-lg bg-amber-950 border border-amber-100"
                >
                  <div className="flex-1">
                    <span className="font-medium text-stone-100">{w.ingredient}</span>
                    <p className="text-xs text-amber-600 font-medium mt-0.5">Ending soon</p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Go-To Dishes */}
      {palette.proven_wins.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Go-To Dishes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1.5">
              {palette.proven_wins.map((pw, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-brand-500 mt-0.5">&#x2022;</span>
                  <div>
                    <span className="font-medium text-stone-100">{pw.dish_name}</span>
                    {pw.notes && <span className="text-stone-500"> &mdash; {pw.notes}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function formatRange(start: string, end: string): string {
  const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const [sm, sd] = start.split('-').map(Number)
  const [em, ed] = end.split('-').map(Number)
  return `${MONTHS[sm - 1]} ${sd} \u2013 ${MONTHS[em - 1]} ${ed}`
}
