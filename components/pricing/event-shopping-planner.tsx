'use client'

/**
 * EventShoppingPlanner - Shows optimized shopping plan for upcoming events.
 * Aggregates ingredients from all confirmed events in the next N days,
 * then runs the Pi optimizer to find the cheapest stores.
 */

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  getUpcomingEventShoppingPlan,
  type EventShoppingPlan,
} from '@/lib/openclaw/event-shopping-actions'
import { getMyPrimaryStoreName } from '@/lib/openclaw/store-preference-actions'
import { useEffect } from 'react'

export function EventShoppingPlanner() {
  const [plan, setPlan] = useState<EventShoppingPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [daysAhead, setDaysAhead] = useState(14)
  const [primaryStore, setPrimaryStore] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getMyPrimaryStoreName()
      .then((name) => {
        if (!cancelled) setPrimaryStore(name)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const handlePlan = () => {
    setError(null)
    startTransition(async () => {
      try {
        const data = await getUpcomingEventShoppingPlan(daysAhead)
        setPlan(data)
      } catch {
        setError('Could not generate shopping plan. Is the Pi online?')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Event Shopping Planner</CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">
              Optimized shopping for your upcoming events
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={daysAhead}
              onChange={(e) => setDaysAhead(Number(e.target.value))}
              aria-label="Planning horizon"
              className="text-xs bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-300"
            >
              <option value={7}>Next 7 days</option>
              <option value={14}>Next 14 days</option>
              <option value={30}>Next 30 days</option>
            </select>
            <Button variant="secondary" size="sm" onClick={handlePlan} disabled={isPending}>
              {isPending ? 'Planning...' : plan ? 'Refresh' : 'Generate Plan'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {error && (
        <CardContent>
          <p className="text-sm text-amber-400">{error}</p>
        </CardContent>
      )}

      {plan && (
        <CardContent className="space-y-4">
          {/* Event summary */}
          {plan.eventCount === 0 ? (
            <p className="text-sm text-stone-500 text-center py-2">
              No confirmed events in the next {daysAhead} days
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 text-xs text-stone-400">
                <span className="bg-stone-800 px-2 py-1 rounded">
                  {plan.eventCount} event{plan.eventCount !== 1 ? 's' : ''}
                </span>
                <span className="bg-stone-800 px-2 py-1 rounded">
                  {plan.ingredients.length} ingredients
                </span>
                <span>
                  {plan.dateRange.start} to {plan.dateRange.end}
                </span>
              </div>

              {/* Events list */}
              <div className="space-y-1">
                {plan.events.map((evt) => (
                  <div key={evt.id} className="flex items-center justify-between text-xs">
                    <span className="text-stone-300">{evt.occasion}</span>
                    <div className="flex items-center gap-3 text-stone-500">
                      <span>{evt.guestCount} guests</span>
                      <span>{evt.eventDate}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Optimization results */}
              {plan.optimization && (
                <div className="space-y-3 pt-2">
                  {/* Single store option */}
                  {plan.optimization.singleStoreBest &&
                    (() => {
                      const isSinglePreferred =
                        !!primaryStore &&
                        plan.optimization.singleStoreBest.store.toLowerCase() ===
                          primaryStore.toLowerCase()
                      return (
                        <div
                          className={`p-3 rounded-lg border ${
                            isSinglePreferred
                              ? 'border-amber-700/50 bg-amber-950/20'
                              : 'border-stone-700 bg-stone-900/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-stone-200">
                                {isSinglePreferred ? 'Your Preferred Store' : 'Best Single Store'}
                              </p>
                              <p className="text-xs text-stone-500 mt-0.5">
                                One trip, {plan.optimization.singleStoreBest.availableCount} items
                                {plan.optimization.singleStoreBest.missingCount > 0 &&
                                  ` (${plan.optimization.singleStoreBest.missingCount} not found)`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-stone-100">
                                {formatCurrency(plan.optimization.singleStoreBest.totalCents)}
                              </p>
                              <p className="text-xs text-stone-400">
                                {isSinglePreferred && (
                                  <span className="text-amber-400 mr-0.5">&#9733;</span>
                                )}
                                {plan.optimization.singleStoreBest.store}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                  {/* Multi-store optimal */}
                  {plan.optimization.multiStoreOptimal &&
                    plan.optimization.multiStoreOptimal.stores.length > 0 && (
                      <div className="p-3 rounded-lg border border-emerald-800/50 bg-emerald-950/20">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-emerald-300">
                              Multi-Store Optimal
                            </p>
                            <p className="text-xs text-stone-500 mt-0.5">
                              {plan.optimization.multiStoreOptimal.stores.length} stores
                              {plan.optimization.multiStoreOptimal.savingsVsSingleStore > 0 &&
                                `, saves ${formatCurrency(plan.optimization.multiStoreOptimal.savingsVsSingleStore)}`}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-emerald-400">
                            {formatCurrency(plan.optimization.multiStoreOptimal.totalCents)}
                          </p>
                        </div>
                        <div className="space-y-1.5 mt-3">
                          {plan.optimization.multiStoreOptimal.stores.map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-stone-300 font-medium">{s.store}</span>
                                <span className="text-stone-500 truncate">
                                  {s.items.slice(0, 3).join(', ')}
                                  {s.items.length > 3 && ` +${s.items.length - 3} more`}
                                </span>
                              </div>
                              <span className="text-stone-400 shrink-0 ml-2">
                                {formatCurrency(s.subtotalCents)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Store rankings */}
                  {plan.optimization.storeRanking.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs font-medium text-stone-400 mb-2">
                        Store Rankings (for your ingredients)
                      </p>
                      <div className="space-y-1">
                        {plan.optimization.storeRanking.slice(0, 5).map((s, i) => {
                          const isRankPreferred =
                            !!primaryStore && s.store.toLowerCase() === primaryStore.toLowerCase()
                          return (
                            <div
                              key={s.store}
                              className="flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-4 text-center font-bold ${
                                    i === 0 ? 'text-emerald-400' : 'text-stone-500'
                                  }`}
                                >
                                  {i + 1}
                                </span>
                                <span className="text-stone-300">
                                  {isRankPreferred && (
                                    <span className="text-amber-400 mr-0.5">&#9733;</span>
                                  )}
                                  {s.store}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-stone-500">
                                <span>{s.coveragePct}% coverage</span>
                                <span>{s.wins} cheapest</span>
                                <span className="text-stone-400 font-medium">
                                  avg {formatCurrency(s.avgCents)}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!plan.optimization && plan.ingredients.length > 0 && (
                <p className="text-sm text-stone-500 text-center py-2">
                  Price data unavailable (Pi offline)
                </p>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
