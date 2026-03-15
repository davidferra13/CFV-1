'use client'

// AllergenConflictAlert - Shows allergen conflicts between menu dishes and client/guest restrictions.
// Critical (FDA Big 9) = red alert. Caution (other) = amber. Safe dishes = green per person.
// Fetches data on mount via server action. Pure set comparison, no AI.

import { useState, useEffect, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from '@/components/ui/icons'
import { checkMenuAllergenConflicts } from '@/lib/dietary/cross-contamination-check'
import type {
  CrossContaminationResult,
  AllergenConflict,
} from '@/lib/dietary/cross-contamination-check'

type Props = {
  eventId: string
}

export function AllergenConflictAlert({ eventId }: Props) {
  const [result, setResult] = useState<CrossContaminationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      try {
        const data = await checkMenuAllergenConflicts(eventId)
        if (!cancelled) setResult(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to check allergen conflicts')
        }
      }
    })
    return () => {
      cancelled = true
    }
  }, [eventId])

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-950 p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">Could not load allergen data: {error}</p>
        </div>
      </div>
    )
  }

  if (isPending || !result) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-stone-400 shrink-0 animate-pulse" />
          <p className="text-sm text-stone-400">Checking allergen conflicts...</p>
        </div>
      </div>
    )
  }

  const { conflicts, safeDishesByPerson, summary } = result

  // No conflicts at all
  if (summary.totalConflicts === 0) {
    return (
      <div className="rounded-lg border border-emerald-800 bg-emerald-950 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium text-emerald-300">
            No allergen conflicts detected for this menu.
          </p>
        </div>
      </div>
    )
  }

  // Group conflicts by person
  const conflictsByPerson = conflicts.reduce<Record<string, AllergenConflict[]>>(
    (acc, conflict) => {
      if (!acc[conflict.personName]) acc[conflict.personName] = []
      acc[conflict.personName].push(conflict)
      return acc
    },
    {}
  )

  const hasCritical = summary.criticalConflicts > 0
  const bannerBorder = hasCritical ? 'border-red-300' : 'border-amber-300'
  const bannerBg = hasCritical ? 'bg-red-950' : 'bg-amber-950'

  function togglePerson(name: string) {
    setExpandedPersons((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  return (
    <div className={`rounded-lg border ${bannerBorder} ${bannerBg} p-4`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert
            className={`h-5 w-5 shrink-0 ${hasCritical ? 'text-red-600' : 'text-amber-600'}`}
          />
          <h3
            className={`text-sm font-semibold ${hasCritical ? 'text-red-300' : 'text-amber-300'}`}
          >
            Allergen Conflicts Detected
          </h3>
          <div className="flex items-center gap-1.5">
            {summary.criticalConflicts > 0 && (
              <Badge variant="error">{summary.criticalConflicts} critical</Badge>
            )}
            {summary.cautionConflicts > 0 && (
              <Badge variant="warning">{summary.cautionConflicts} caution</Badge>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-stone-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 space-y-3">
          {Object.entries(conflictsByPerson).map(([personName, personConflicts]) => {
            const isExpanded = expandedPersons.has(personName)
            const personSafe = safeDishesByPerson[personName] ?? []
            const personHasCritical = personConflicts.some((c) => c.isFdaBig9)
            const personType = personConflicts[0]?.personType ?? 'guest'

            return (
              <div key={personName} className="rounded-md bg-stone-900/80 overflow-hidden">
                {/* Person header */}
                <button
                  type="button"
                  onClick={() => togglePerson(personName)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-stone-100 truncate">
                      {personName}
                    </span>
                    <Badge variant={personType === 'client' ? 'info' : 'default'}>
                      {personType}
                    </Badge>
                    {personHasCritical && (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-stone-400 shrink-0">
                    {personConflicts.length} conflict{personConflicts.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    {/* Conflicts */}
                    {personConflicts.map((conflict, idx) => (
                      <div
                        key={`${conflict.allergen}-${idx}`}
                        className={`rounded px-2.5 py-2 ${
                          conflict.isFdaBig9
                            ? 'bg-red-950/60 border border-red-900'
                            : 'bg-amber-950/60 border border-amber-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={conflict.isFdaBig9 ? 'error' : 'warning'}>
                            {conflict.isFdaBig9 ? 'FDA Big 9' : 'Caution'}
                          </Badge>
                          <span className="text-sm font-medium text-stone-200">
                            {conflict.allergen}
                          </span>
                        </div>
                        <ul className="mt-1 space-y-0.5">
                          {conflict.conflictingDishes.map((dish, dIdx) => (
                            <li
                              key={dIdx}
                              className="text-xs text-stone-400 flex items-start gap-1.5"
                            >
                              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-stone-500" />
                              <span>
                                <span className="font-medium text-stone-300">{dish.dishName}</span>
                                {dish.componentName && (
                                  <span className="text-stone-500"> ({dish.componentName})</span>
                                )}
                                {' contains '}
                                <span className="font-medium text-stone-300">
                                  {dish.ingredientName}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}

                    {/* Safe dishes */}
                    {personSafe.length > 0 && (
                      <div className="rounded px-2.5 py-2 bg-emerald-950/40 border border-emerald-900">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-xs font-medium text-emerald-400">
                            Safe dishes for {personName}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {personSafe.map((dishName) => (
                            <Badge key={dishName} variant="success">
                              {dishName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
