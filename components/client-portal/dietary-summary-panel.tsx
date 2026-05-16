'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, ChevronDown, ChevronUp } from '@/components/ui/icons'
import type {
  DietarySummaryCounts,
  GuestDietaryEntry,
} from '@/lib/dinner-circles/guest-dietary-summary'

type DietarySummaryPanelProps = {
  responded: number
  total: number
  summary: DietarySummaryCounts
  guests: GuestDietaryEntry[]
}

function SummaryRow({ label, count }: { label: string; count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-stone-300">{label}</span>
      <span className="text-sm font-medium text-stone-100">{count}</span>
    </div>
  )
}

export function DietarySummaryPanel({
  responded,
  total,
  summary,
  guests,
}: DietarySummaryPanelProps) {
  const [expanded, setExpanded] = useState(false)

  const hasAnyData = responded > 0
  if (!hasAnyData && total === 0) return null

  const allResponded = responded === total && total > 0

  return (
    <Card className="border-stone-700 bg-stone-950/70">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-stone-100">Guest Dietary Summary</h3>
          {allResponded && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/30 px-2.5 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              All guests responded
            </span>
          )}
        </div>

        {!hasAnyData ? (
          <p className="mt-3 text-sm text-stone-500">
            No dietary responses yet. Share the guest link above to start collecting.
          </p>
        ) : (
          <>
            {/* Summary counts */}
            <div className="mt-4 divide-y divide-stone-800 border-t border-stone-800">
              <SummaryRow label="Allergies" count={summary.allergies} />
              <SummaryRow label="Vegetarian" count={summary.vegetarian} />
              <SummaryRow label="Vegan" count={summary.vegan} />
              <SummaryRow label="Gluten-free" count={summary.glutenFree} />
              <SummaryRow label="No restrictions" count={summary.noRestrictions} />
              {summary.other > 0 && (
                <SummaryRow label="Other dietary needs" count={summary.other} />
              )}
            </div>

            {/* Expandable detail */}
            {guests.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
                >
                  {expanded ? 'Hide details' : 'View guest details'}
                  {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {expanded && (
                  <div className="mt-3 space-y-2">
                    {guests.map((guest, idx) => {
                      const allItems = [
                        ...guest.restrictions,
                        ...guest.allergies.map((a) => `Allergy: ${a}`),
                      ]
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-stone-800 bg-stone-900/50 px-3 py-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-stone-200">{guest.name}</span>
                            {!guest.hasResponded && (
                              <span className="text-xs text-stone-500">Pending</span>
                            )}
                          </div>
                          {allItems.length > 0 ? (
                            <p className="mt-1 text-xs text-stone-400">{allItems.join(', ')}</p>
                          ) : guest.hasResponded ? (
                            <p className="mt-1 text-xs text-stone-500">No restrictions</p>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
