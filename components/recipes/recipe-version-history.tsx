// Recipe Version History Panel
// Shows version timeline with cost changes over time.
'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  getRecipeVersionHistory,
  getRecipeVersionDetail,
  type RecipeVersionSummary,
  type RecipeVersionDetail,
} from '@/lib/recipes/version-actions'
import { format, parseISO } from 'date-fns'

type Props = {
  recipeId: string
}

function formatCost(cents: number | null): string {
  if (cents == null) return 'N/A'
  return `$${(cents / 100).toFixed(2)}`
}

function costDelta(current: number | null, previous: number | null): string | null {
  if (current == null || previous == null || current === previous) return null
  const diff = current - previous
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : 0
  const sign = diff > 0 ? '+' : ''
  return `${sign}${formatCost(diff)} (${sign}${pct}%)`
}

export function RecipeVersionHistory({ recipeId }: Props) {
  const [versions, setVersions] = useState<RecipeVersionSummary[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<RecipeVersionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    startTransition(async () => {
      try {
        const data = await getRecipeVersionHistory(recipeId)
        if (!cancelled) setVersions(data)
      } catch {
        // silent
      }
    })
    return () => {
      cancelled = true
    }
  }, [recipeId])

  if (versions.length === 0 && !isPending) return null

  const handleExpand = async (versionId: string) => {
    if (expanded === versionId) {
      setExpanded(null)
      setDetail(null)
      return
    }
    setExpanded(versionId)
    setLoading(true)
    try {
      const d = await getRecipeVersionDetail(versionId)
      setDetail(d)
    } catch {
      setDetail(null)
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-stone-300">
          Version History ({versions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isPending && versions.length === 0 && (
          <p className="text-xs text-stone-500">Loading history...</p>
        )}

        {versions.map((v, idx) => {
          const prev = versions[idx + 1] ?? null
          const delta = costDelta(v.totalCostCents, prev?.totalCostCents ?? null)
          const isExpanded = expanded === v.id

          return (
            <div key={v.id} className="border border-stone-700 rounded-lg overflow-hidden">
              <button
                onClick={() => handleExpand(v.id)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-stone-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="default">v{v.versionNumber}</Badge>
                  <span className="text-xs text-stone-400 truncate">{v.changeSummary}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  {v.totalCostCents != null && (
                    <span className="text-xs text-stone-300 font-mono">
                      {formatCost(v.totalCostCents)}
                    </span>
                  )}
                  {delta && (
                    <span
                      className={`text-[10px] font-medium ${
                        delta.startsWith('+') ? 'text-red-400' : 'text-green-400'
                      }`}
                    >
                      {delta}
                    </span>
                  )}
                  <span className="text-[10px] text-stone-500">
                    {format(parseISO(v.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 py-2 border-t border-stone-700 bg-stone-900/50">
                  {loading ? (
                    <p className="text-xs text-stone-500">Loading...</p>
                  ) : detail ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-stone-500">Total cost:</span>{' '}
                          <span className="text-stone-300">
                            {formatCost(detail.totalCostCents)}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500">Per portion:</span>{' '}
                          <span className="text-stone-300">
                            {formatCost(detail.costPerPortionCents)}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500">Ingredients:</span>{' '}
                          <span className="text-stone-300">{detail.ingredientCount}</span>
                        </div>
                        {detail.snapshot.yield_quantity && (
                          <div>
                            <span className="text-stone-500">Yield:</span>{' '}
                            <span className="text-stone-300">
                              {detail.snapshot.yield_quantity}{' '}
                              {detail.snapshot.yield_unit ?? 'portions'}
                            </span>
                          </div>
                        )}
                      </div>

                      {detail.snapshot.ingredients && detail.snapshot.ingredients.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                            Ingredients at this version
                          </p>
                          <div className="space-y-0.5">
                            {detail.snapshot.ingredients.map((ing, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-stone-400">
                                  {ing.quantity} {ing.unit} {ing.name}
                                  {ing.isOptional && (
                                    <span className="text-stone-600 ml-1">(optional)</span>
                                  )}
                                </span>
                                <span className="text-stone-500 font-mono">
                                  {ing.priceCents != null
                                    ? formatCost(Math.round(ing.quantity * ing.priceCents))
                                    : '-'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500">Version details unavailable</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
