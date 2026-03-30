'use client'

import { useMemo, useState, useRef } from 'react'
import type { MealBoardEntry, MealType } from '@/lib/hub/types'

interface WeeklyPrepSummaryProps {
  weekEntries: MealBoardEntry[]
  defaultHeadCount: number | null
  weekLabel: string
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

function formatDayShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function WeeklyPrepSummary({
  weekEntries,
  defaultHeadCount,
  weekLabel,
}: WeeklyPrepSummaryProps) {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const planned = useMemo(() => weekEntries.filter((e) => e.status !== 'cancelled'), [weekEntries])

  const summary = useMemo(() => {
    // Group by date
    const byDate = new Map<string, MealBoardEntry[]>()
    for (const entry of planned) {
      const existing = byDate.get(entry.meal_date) ?? []
      existing.push(entry)
      byDate.set(entry.meal_date, existing)
    }

    // Sort dates
    const sortedDates = [...byDate.keys()].sort()

    // Collect all unique dietary tags and allergen flags
    const allTags = new Set<string>()
    const allAllergens = new Set<string>()
    let totalHeadCountSum = 0
    let headCountEntries = 0
    const prepNotes: { date: string; meal: string; note: string }[] = []

    for (const entry of planned) {
      entry.dietary_tags.forEach((t) => allTags.add(t))
      entry.allergen_flags.forEach((f) => allAllergens.add(f))
      const hc = entry.head_count ?? defaultHeadCount
      if (hc) {
        totalHeadCountSum += hc
        headCountEntries++
      }
      if (entry.prep_notes) {
        prepNotes.push({
          date: entry.meal_date,
          meal: MEAL_LABELS[entry.meal_type],
          note: entry.prep_notes,
        })
      }
    }

    const avgHeadCount =
      headCountEntries > 0 ? Math.round(totalHeadCountSum / headCountEntries) : null

    return {
      byDate,
      sortedDates,
      totalMeals: planned.length,
      allTags: [...allTags].sort(),
      allAllergens: [...allAllergens].sort(),
      avgHeadCount,
      prepNotes,
    }
  }, [planned, defaultHeadCount])

  if (planned.length === 0) return null

  const handleCopy = () => {
    if (!contentRef.current) return
    const text = contentRef.current.innerText
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/40">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-300">Weekly Prep Brief</span>
          <span className="rounded-full bg-stone-700/50 px-1.5 py-0.5 text-[10px] text-stone-400">
            {summary.totalMeals} meals
          </span>
        </div>
        <span className="text-[10px] text-stone-600">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-stone-800 p-3">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded bg-stone-700 px-2 py-1 text-[10px] text-stone-300 hover:bg-stone-600"
            >
              Copy to clipboard
            </button>
          </div>

          <div ref={contentRef} className="space-y-3 text-xs">
            {/* Header */}
            <div>
              <p className="font-semibold text-stone-200">Prep Brief: {weekLabel}</p>
              <p className="text-stone-500">
                {summary.totalMeals} meals planned
                {summary.avgHeadCount ? ` | Avg. ${summary.avgHeadCount} covers` : ''}
              </p>
            </div>

            {/* Allergen/dietary alerts */}
            {(summary.allAllergens.length > 0 || summary.allTags.length > 0) && (
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-red-400">
                  Watch list
                </p>
                <div className="flex flex-wrap gap-1">
                  {summary.allAllergens.map((a) => (
                    <span
                      key={a}
                      className="rounded-full bg-red-900/40 px-1.5 py-0.5 text-[10px] text-red-300"
                    >
                      ⚠ {a}
                    </span>
                  ))}
                  {summary.allTags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-emerald-900/40 px-1.5 py-0.5 text-[10px] text-emerald-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Day-by-day breakdown */}
            {summary.sortedDates.map((dateStr) => {
              const meals = summary.byDate.get(dateStr) ?? []
              const sorted = meals.sort(
                (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
              )

              return (
                <div key={dateStr}>
                  <p className="mb-1 font-medium text-stone-300">{formatDayShort(dateStr)}</p>
                  <div className="ml-2 space-y-0.5">
                    {sorted.map((meal) => {
                      const hc = meal.head_count ?? defaultHeadCount
                      return (
                        <div key={meal.id} className="flex items-baseline gap-2">
                          <span className="w-16 shrink-0 text-stone-500">
                            {MEAL_LABELS[meal.meal_type]}
                          </span>
                          <span className="text-stone-200">{meal.title}</span>
                          {hc && <span className="text-[10px] text-stone-500">({hc} pax)</span>}
                          {meal.status === 'confirmed' && (
                            <span className="text-[10px] text-blue-400">confirmed</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Prep notes */}
            {summary.prepNotes.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-amber-500">
                  Prep notes
                </p>
                <div className="ml-2 space-y-0.5">
                  {summary.prepNotes.map((n, i) => (
                    <p key={i} className="text-stone-400">
                      <span className="text-stone-500">
                        {formatDayShort(n.date)} {n.meal}:
                      </span>{' '}
                      {n.note}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
