'use client'

// Recipe Track Record Panel
// Shows how a recipe has performed across events based on AAR feedback.
// Displayed on the recipe detail page.
//   - Times cooked + last cooked date
//   - Timing accuracy distribution (faster/on time/slower)
//   - Would-use-again rate
//   - Recent feedback from specific events

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import type { RecipeTrackRecord } from '@/lib/aar/feedback-actions'
import { getRecipeTrackRecord } from '@/lib/aar/feedback-actions'
import { format } from 'date-fns'

type Props = {
  recipeId: string
}

function TimingBar({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-400 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-stone-500 w-6 text-right">{count}</span>
    </div>
  )
}

export function RecipeTrackRecordPanel({ recipeId }: Props) {
  const [data, setData] = useState<RecipeTrackRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getRecipeTrackRecord(recipeId)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        console.error('[RecipeTrackRecordPanel] Error:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [recipeId])

  if (loading) {
    return (
      <Card className="p-5">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-stone-800 rounded w-1/3" />
          <div className="h-3 bg-stone-800 rounded w-full" />
        </div>
      </Card>
    )
  }

  // Don't render if no data at all
  if (!data || (data.timesCooked === 0 && data.recentFeedback.length === 0)) {
    return null
  }

  const totalTimingVotes =
    data.avgTimingAccuracy.faster + data.avgTimingAccuracy.accurate + data.avgTimingAccuracy.slower
  const hasFeedback = data.recentFeedback.length > 0

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-stone-100 mb-3">Track Record</h3>

      {/* Stats row */}
      <div className="flex gap-6 mb-4">
        <div>
          <p className="text-2xl font-bold text-stone-100">{data.timesCooked}</p>
          <p className="text-xs text-stone-500">Times cooked</p>
        </div>
        {data.lastCookedAt && (
          <div>
            <p className="text-sm font-medium text-stone-200">
              {format(new Date(data.lastCookedAt), 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-stone-500">Last cooked</p>
          </div>
        )}
        {data.wouldUseAgainRate !== null && (
          <div>
            <p className="text-2xl font-bold text-stone-100">
              {Math.round(data.wouldUseAgainRate * 100)}%
            </p>
            <p className="text-xs text-stone-500">Would use again</p>
          </div>
        )}
      </div>

      {/* Timing accuracy distribution */}
      {totalTimingVotes > 0 && (
        <div className="space-y-1.5 mb-4">
          <p className="text-xs text-stone-400 font-medium mb-2">Timing accuracy</p>
          <TimingBar
            label="Faster"
            count={data.avgTimingAccuracy.faster}
            total={totalTimingVotes}
            color="bg-green-500"
          />
          <TimingBar
            label="On time"
            count={data.avgTimingAccuracy.accurate}
            total={totalTimingVotes}
            color="bg-brand-500"
          />
          <TimingBar
            label="Slower"
            count={data.avgTimingAccuracy.slower}
            total={totalTimingVotes}
            color="bg-amber-500"
          />
        </div>
      )}

      {/* Recent feedback from events */}
      {hasFeedback && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-stone-500 cursor-pointer hover:text-stone-300"
          >
            {expanded ? 'Hide' : 'Show'} feedback from {data.recentFeedback.length} event
            {data.recentFeedback.length !== 1 ? 's' : ''}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2">
              {data.recentFeedback.map((fb, i) => (
                <div key={i} className="text-xs border border-stone-800/50 rounded p-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-stone-300 font-medium">{fb.eventOccasion}</span>
                    <span className="text-stone-500">
                      {fb.eventDate ? format(new Date(fb.eventDate), 'MMM d, yyyy') : ''}
                    </span>
                  </div>
                  {fb.clientName && <p className="text-stone-500">{fb.clientName}</p>}
                  <div className="flex gap-3">
                    {fb.timingAccuracy && (
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          fb.timingAccuracy === 'faster'
                            ? 'bg-green-900/50 text-green-400'
                            : fb.timingAccuracy === 'accurate'
                              ? 'bg-brand-900/50 text-brand-400'
                              : 'bg-amber-900/50 text-amber-400'
                        }`}
                      >
                        {fb.timingAccuracy === 'faster'
                          ? 'Faster'
                          : fb.timingAccuracy === 'accurate'
                            ? 'On time'
                            : 'Slower'}
                      </span>
                    )}
                    <span className={fb.wouldUseAgain ? 'text-green-400' : 'text-red-400'}>
                      {fb.wouldUseAgain ? 'Would repeat' : 'Would not repeat'}
                    </span>
                  </div>
                  {fb.notes && <p className="text-stone-400 italic">{fb.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
