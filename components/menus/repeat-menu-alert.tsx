'use client'

import { useState, useEffect, useTransition } from 'react'
import { checkRepeatMenu, type RepeatMenuResult } from '@/lib/menus/repeat-detection'

interface RepeatMenuAlertProps {
  eventId: string
  clientName?: string
}

export function RepeatMenuAlert({ eventId, clientName }: RepeatMenuAlertProps) {
  const [result, setResult] = useState<RepeatMenuResult | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    startTransition(async () => {
      try {
        const data = await checkRepeatMenu(eventId)
        if (!cancelled) {
          setResult(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[RepeatMenuAlert] Failed to check repeat menu:', err)
          setError('Could not check for repeat menus')
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [eventId])

  // Don't render anything if dismissed, loading, errored, or no repeats above threshold
  if (dismissed) return null
  if (isPending || !result) return null
  if (error) return null
  if (!result.hasRepeats) return null

  // Only show alert if any overlap is above 30%
  const significantOverlaps = result.overlaps.filter((o) => o.overlapPercentage > 30)
  if (significantOverlaps.length === 0) return null

  const topOverlap = significantOverlaps[0]
  const totalShared = new Set(
    significantOverlaps.flatMap((o) => o.sharedRecipes.map((r) => r.recipeId))
  ).size

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-amber-600">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Repeat menu detected: {totalShared} recipe{totalShared !== 1 ? 's' : ''} shared with a
              previous menu
              {clientName ? ` served to ${clientName}` : ''}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {topOverlap.overlapPercentage}% overlap with &quot;{topOverlap.pastMenuName}&quot; (
              {new Date(topOverlap.pastEventDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              )
              {significantOverlaps.length > 1
                ? ` and ${significantOverlaps.length - 1} other past menu${significantOverlaps.length > 2 ? 's' : ''}`
                : ''}
            </p>

            {expanded && (
              <div className="mt-3 space-y-3">
                {significantOverlaps.map((overlap) => (
                  <div key={overlap.pastEventId} className="border-t border-amber-200 pt-2">
                    <p className="text-xs font-medium text-amber-700">
                      {overlap.pastMenuName} (
                      {new Date(overlap.pastEventDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      ) - {overlap.overlapPercentage}% overlap
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {overlap.sharedRecipes.map((recipe) => (
                        <li key={recipe.recipeId} className="text-xs text-amber-600 pl-3">
                          {recipe.recipeName}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {result.suggestions.length > 0 && (
                  <div className="border-t border-amber-200 pt-2">
                    <p className="text-xs font-medium text-amber-700 mb-1">Suggestions:</p>
                    <ul className="space-y-0.5">
                      {result.suggestions.map((suggestion, i) => (
                        <li key={i} className="text-xs text-amber-600 pl-3">
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-amber-700 hover:text-amber-900 underline mt-2"
            >
              {expanded ? 'Show less' : 'Show details'}
            </button>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-600 p-1 shrink-0"
          aria-label="Dismiss repeat menu alert"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
