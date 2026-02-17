// Seasonal Sidebar — Schedule Integration
// Full seasonal context panel: sensory anchor, micro-windows, context profiles,
// pantry notes, energy reality, proven wins.

import type { SeasonalPalette } from '@/lib/seasonal/types'
import { getActiveMicroWindows, getEndingMicroWindows } from '@/lib/seasonal/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const SEASON_ACCENT: Record<string, string> = {
  Winter: 'border-l-sky-400',
  Spring: 'border-l-emerald-400',
  Summer: 'border-l-amber-400',
  Autumn: 'border-l-orange-400',
}

export function SeasonalSidebar({ palette }: { palette: SeasonalPalette }) {
  const activeMicroWindows = getActiveMicroWindows(palette)
  const endingMicroWindows = getEndingMicroWindows(palette)
  const accentClass = SEASON_ACCENT[palette.season_name] || 'border-l-stone-400'

  const isEmpty = !palette.sensory_anchor
    && palette.micro_windows.length === 0
    && palette.context_profiles.length === 0
    && !palette.pantry_and_preserve
    && !palette.chef_energy_reality
    && palette.proven_wins.length === 0

  return (
    <div className={`space-y-4 border-l-4 ${accentClass} pl-4`}>
      {/* Season Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-stone-900">{palette.season_name} Reality</h3>
            <Link
              href={`/settings/repertoire/${palette.id}`}
              className="text-xs text-brand-600 hover:text-brand-700"
            >
              Edit
            </Link>
          </div>
          {palette.sensory_anchor ? (
            <p className="text-sm text-stone-600 italic mt-2">
              &ldquo;{palette.sensory_anchor}&rdquo;
            </p>
          ) : (
            <p className="text-sm text-stone-400 mt-2">
              No sensory anchor set.{' '}
              <Link href={`/settings/repertoire/${palette.id}`} className="text-brand-600 hover:text-brand-700">
                Define your creative thesis
              </Link>
            </p>
          )}
          {/* Date range */}
          <p className="text-xs text-stone-400 mt-2">
            {formatRange(palette.start_month_day, palette.end_month_day)}
          </p>
        </CardContent>
      </Card>

      {/* Empty state prompt */}
      {isEmpty && (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-stone-500 mb-2">
              Your {palette.season_name} palette is unconfigured.
            </p>
            <p className="text-xs text-stone-400">
              Add micro-windows, context profiles, and proven wins to guide your menus and scheduling.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Micro-Windows */}
      {(activeMicroWindows.length > 0 || endingMicroWindows.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ingredient Windows</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {activeMicroWindows.map((w, i) => {
              const isEnding = endingMicroWindows.some(e => e.name === w.name)
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-sm p-2 rounded-lg ${
                    w.urgency === 'high'
                      ? 'bg-red-50 border border-red-100'
                      : isEnding
                      ? 'bg-amber-50 border border-amber-100'
                      : 'bg-stone-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      {w.urgency === 'high' && (
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      )}
                      <span className="font-medium text-stone-900">{w.ingredient}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {w.start_date} to {w.end_date}
                      {isEnding && <span className="text-amber-600 font-medium"> &mdash; ending soon</span>}
                    </p>
                    {w.notes && <p className="text-xs text-stone-400 mt-0.5">{w.notes}</p>}
                  </div>
                </div>
              )
            })}
            {/* Show ending-only not already shown */}
            {endingMicroWindows
              .filter(e => !activeMicroWindows.some(a => a.name === e.name))
              .map((w, i) => (
                <div key={`ending-${i}`} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="flex-1">
                    <span className="font-medium text-stone-900">{w.ingredient}</span>
                    <p className="text-xs text-amber-600 font-medium mt-0.5">Window ending soon</p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Context Profiles */}
      {palette.context_profiles.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Context Profiles</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {palette.context_profiles.map((cp, i) => (
              <div key={i} className="bg-stone-50 rounded-lg p-2.5">
                <p className="text-sm font-medium text-stone-900">{cp.name}</p>
                <p className="text-xs text-stone-600 mt-0.5">{cp.kitchen_reality}</p>
                {cp.menu_guardrails && (
                  <p className="text-xs text-stone-500 mt-0.5 italic">{cp.menu_guardrails}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pantry & Energy */}
      {(palette.pantry_and_preserve || palette.chef_energy_reality) && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {palette.pantry_and_preserve && (
              <div>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">Pantry & Preserve</p>
                <p className="text-sm text-stone-700">{palette.pantry_and_preserve}</p>
              </div>
            )}
            {palette.chef_energy_reality && (
              <div>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">Energy Reality</p>
                <p className="text-sm text-stone-700">{palette.chef_energy_reality}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Proven Wins */}
      {palette.proven_wins.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Proven Wins</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1.5">
              {palette.proven_wins.map((pw, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-brand-500 mt-0.5">&#x2022;</span>
                  <div>
                    <span className="font-medium text-stone-900">{pw.dish_name}</span>
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

// Format MM-DD range into readable text
function formatRange(start: string, end: string): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const [sm, sd] = start.split('-').map(Number)
  const [em, ed] = end.split('-').map(Number)
  return `${MONTHS[sm - 1]} ${sd} \u2013 ${MONTHS[em - 1]} ${ed}`
}
