'use client'

// AllergenMatrix - Grid showing allergens vs dishes for a menu.
// Red cells = dish contains that allergen. Green cells = safe.
// Useful for kitchen display and menu planning.
// Fetches data on mount via server action. No AI.

import { useState, useEffect, useTransition } from 'react'
import { ShieldAlert, CheckCircle } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { allergenShortName, FDA_BIG_9 } from '@/lib/constants/allergens'
import { getMenuAllergenMatrix } from '@/lib/dietary/cross-contamination-check'
import type { AllergenMatrixResult } from '@/lib/dietary/cross-contamination-check'

type Props = {
  menuId: string
}

const FDA_BIG_9_LOWER = FDA_BIG_9.map((a) => a.toLowerCase())

function isFdaBig9(allergen: string): boolean {
  const lower = allergen.toLowerCase()
  return FDA_BIG_9_LOWER.some((big9) => lower.includes(big9) || big9.includes(lower))
}

export function AllergenMatrix({ menuId }: Props) {
  const [result, setResult] = useState<AllergenMatrixResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      try {
        const data = await getMenuAllergenMatrix(menuId)
        if (!cancelled) setResult(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load allergen matrix')
        }
      }
    })
    return () => {
      cancelled = true
    }
  }, [menuId])

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-950 p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">Could not load allergen matrix: {error}</p>
        </div>
      </div>
    )
  }

  if (isPending || !result) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-stone-400 shrink-0 animate-pulse" />
          <p className="text-sm text-stone-400">Loading allergen matrix...</p>
        </div>
      </div>
    )
  }

  const { allergens, dishes, matrix } = result

  if (allergens.length === 0 || dishes.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-800 bg-emerald-950 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium text-emerald-300">
            No allergens detected in this menu.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold text-base">Allergen Matrix</h3>
        <span className="text-xs text-stone-400">
          {allergens.length} allergen{allergens.length !== 1 ? 's' : ''} across {dishes.length} dish
          {dishes.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-stone-400">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-red-900 border border-red-700" />
          <span>Contains allergen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-emerald-900 border border-emerald-700" />
          <span>Safe</span>
        </div>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto rounded-lg border border-stone-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-800">
              <th className="sticky left-0 z-10 bg-stone-800 px-3 py-2 text-left font-medium text-stone-300 border-b border-stone-700 min-w-[140px]">
                Allergen
              </th>
              {dishes.map((dish) => (
                <th
                  key={dish.id}
                  className="px-3 py-2 text-center font-medium text-stone-300 border-b border-stone-700 min-w-[100px]"
                >
                  <div className="text-xs text-stone-500 mb-0.5">{dish.courseName}</div>
                  <div className="truncate max-w-[120px]" title={dish.name}>
                    {dish.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allergens.map((allergen, rowIdx) => {
              const big9 = isFdaBig9(allergen)
              return (
                <tr
                  key={allergen}
                  className={rowIdx % 2 === 0 ? 'bg-stone-900' : 'bg-stone-900/60'}
                >
                  <td className="sticky left-0 z-10 px-3 py-2 border-b border-stone-800 font-medium bg-inherit">
                    <div className="flex items-center gap-1.5">
                      <span className={big9 ? 'text-red-400' : 'text-amber-400'}>
                        {allergenShortName(allergen)}
                      </span>
                      {big9 && (
                        <Badge variant="error" className="text-xxs px-1 py-0">
                          Big 9
                        </Badge>
                      )}
                    </div>
                  </td>
                  {dishes.map((dish) => {
                    const cell = matrix[allergen]?.[dish.id]
                    const contains = cell?.contains ?? false
                    return (
                      <td
                        key={dish.id}
                        className={`px-3 py-2 text-center border-b border-stone-800 ${
                          contains ? 'bg-red-950/60' : 'bg-emerald-950/30'
                        }`}
                        title={
                          contains
                            ? `Contains: ${(cell?.ingredientNames ?? []).join(', ')}`
                            : 'Safe'
                        }
                      >
                        {contains ? (
                          <span className="text-red-400 font-bold text-xs">X</span>
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 mx-auto" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
