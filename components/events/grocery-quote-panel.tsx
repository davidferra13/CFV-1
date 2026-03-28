'use client'

// GroceryQuotePanel - interactive price comparison table + Instacart CTA.
// Shows Spoonacular (US average) vs Kroger (real shelf price) vs average.
// Allows chef to save discovered prices back to the Recipe Book.

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { runGroceryPriceQuote, type GroceryQuoteResult } from '@/lib/grocery/pricing-actions'
import { bulkUpdateIngredientPrices } from '@/lib/recipes/bulk-price-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { GroceryLivePricingSidebar } from '@/components/events/grocery-live-pricing-sidebar'
import { format } from 'date-fns'

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  eventId: string
  initialQuote: GroceryQuoteResult | null
  quotedPriceCents: number | null
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatQty(qty: number, unit: string): string {
  const rounded = Number.isInteger(qty) ? qty : parseFloat(qty.toFixed(2))
  return `${rounded} ${unit}`
}

function PriceCell({ cents }: { cents: number | null }) {
  if (cents === null) return <span className="text-stone-300">-</span>
  return <span>{formatCurrency(cents)}</span>
}

function BudgetBar({
  averageCents,
  ceilingCents,
  quotedCents,
}: {
  averageCents: number
  ceilingCents: number | null
  quotedCents: number | null
}) {
  if (!ceilingCents || !quotedCents) return null

  const pct = Math.round((averageCents / ceilingCents) * 100)
  const overBudget = averageCents > ceilingCents
  const barColor = overBudget ? 'bg-red-500' : pct > 85 ? 'bg-amber-400' : 'bg-emerald-500'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-stone-300">
          Estimated vs budget ({formatCurrency(ceilingCents)} food cost ceiling)
        </span>
        <span className={`font-semibold ${overBudget ? 'text-red-600' : 'text-emerald-700'}`}>
          {pct}% of budget
          {overBudget && ' - over by ' + formatCurrency(averageCents - ceilingCents)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-stone-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-stone-300">Quoted: {formatCurrency(quotedCents)} total revenue</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GroceryQuotePanel({ eventId, initialQuote, quotedPriceCents }: Props) {
  const [quote, setQuote] = useState<GroceryQuoteResult | null>(initialQuote)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoRunEventIdRef = useRef<string | null>(null)

  const runQuote = useCallback(
    (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false
      setError(null)
      setSaved(false)
      startTransition(async () => {
        try {
          const result = await runGroceryPriceQuote(eventId)
          if (!result) {
            if (!silent) {
              setError('No ingredients found. Make sure this event has a menu with recipes linked.')
            }
            return
          }
          setQuote(result)
        } catch {
          if (!silent) {
            setError('Something went wrong fetching prices. Please try again.')
          }
        }
      })
    },
    [eventId, startTransition]
  )

  function handleRunQuote() {
    runQuote()
  }

  useEffect(() => {
    if (quote || autoRunEventIdRef.current === eventId) return
    autoRunEventIdRef.current = eventId
    runQuote({ silent: true })
  }, [eventId, quote, runQuote])

  function handleSaveToRecipeBook() {
    if (!quote) return
    setSaved(false)
    startTransition(async () => {
      try {
        const updates = quote.items
          .filter((item) => item.averageCents !== null && item.quantity > 0)
          .map((item) => ({
            ingredientId: item.ingredientId,
            // Store price per unit (average ÷ quantity) so it's quantity-independent
            pricePerUnitCents: Math.round((item.averageCents ?? 0) / item.quantity),
          }))

        if (updates.length === 0) return

        await bulkUpdateIngredientPrices(updates)
        setSaved(true)
      } catch (err) {
        toast.error('Failed to save prices to recipe book')
      }
    })
  }

  const hasQuote = !!quote
  const mealMeConfigured = quote?.mealMeConfigured ?? false

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        {/* Run / Refresh button */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-100">
                {hasQuote ? 'Price Quote Results' : 'Ready to Price This Event'}
              </h2>
              {quote?.createdAt && (
                <p className="text-xs text-stone-300 mt-0.5">
                  {quote.isFromCache ? 'Cached' : 'Generated'}{' '}
                  {format(new Date(quote.createdAt), "MMM d 'at' h:mm a")} · {quote.ingredientCount}{' '}
                  ingredients
                </p>
              )}
              {!hasQuote && (
                <p className="text-sm text-stone-500 mt-1">
                  Uses USDA Northeast prices + Spoonacular, Kroger
                  {mealMeConfigured
                    ? ', and MealMe (your local stores)'
                    : ', and MealMe when configured'}{' '}
                  - NE-calibrated average of all sources.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasQuote && (
                <Button variant="ghost" onClick={handleRunQuote} loading={isPending}>
                  {isPending ? 'Refreshing...' : 'Refresh Prices'}
                </Button>
              )}
              {!hasQuote && (
                <Button onClick={handleRunQuote} loading={isPending}>
                  {isPending ? 'Fetching prices...' : 'Get Grocery Quote'}
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-red-950 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isPending && (
            <div className="mt-6 space-y-2">
              <div className="h-4 loading-bone loading-bone-muted" />
              <div className="h-4 loading-bone loading-bone-muted w-4/5" />
              <div className="h-4 loading-bone loading-bone-muted w-3/5" />
              <p className="text-xs text-stone-300 mt-3">
                Checking USDA NE data, Spoonacular, and Kroger for each ingredient - this may take
                10–30s...
              </p>
            </div>
          )}
        </Card>

        {/* Price comparison table */}
        {quote && !isPending && (
          <>
            {/* MealMe setup callout - shown until MEALME_API_KEY is configured */}
            {!mealMeConfigured && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-950 px-4 py-3">
                <p className="text-sm font-medium text-emerald-900">
                  Add MealMe to see prices from your actual stores
                </p>
                <p className="text-sm text-emerald-700 mt-1">
                  MealMe covers Market Basket, Hannaford, Shaw&apos;s, Stop &amp; Shop, Whole Foods,
                  Walmart, and 1M+ more stores - all with real-time shelf prices. Contact{' '}
                  <a
                    href="https://www.mealme.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    mealme.ai
                  </a>{' '}
                  to get an API key, then add{' '}
                  <code className="font-mono text-xs bg-emerald-900 px-1 rounded">
                    MEALME_API_KEY
                  </code>{' '}
                  to your environment.
                </p>
              </div>
            )}

            <Card className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700">
                      <th className="text-left py-2 pr-4 font-medium text-stone-300">Ingredient</th>
                      <th className="text-left py-2 pr-4 font-medium text-stone-300 whitespace-nowrap">
                        Qty
                      </th>
                      <th className="text-right py-2 pr-4 font-medium text-brand-700 whitespace-nowrap">
                        USDA (NE)
                      </th>
                      <th className="text-right py-2 pr-4 font-medium text-stone-500 whitespace-nowrap">
                        Spoonacular
                      </th>
                      <th className="text-right py-2 pr-4 font-medium text-stone-500 whitespace-nowrap">
                        Kroger
                      </th>
                      <th
                        className={`text-right py-2 pr-4 font-medium whitespace-nowrap ${mealMeConfigured ? 'text-emerald-700' : 'text-stone-300'}`}
                      >
                        Local Stores
                        {!mealMeConfigured && (
                          <span className="block text-xs font-normal">(MealMe)</span>
                        )}
                      </th>
                      <th className="text-right py-2 font-medium text-stone-100 whitespace-nowrap">
                        Avg Estimate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item, i) => (
                      <tr
                        key={`${item.ingredientId}-${i}`}
                        className={`border-b border-stone-800 last:border-0 ${item.hasNoApiData ? 'bg-amber-950' : ''}`}
                      >
                        <td className="py-2 pr-4 text-stone-100">
                          {item.ingredientName}
                          {item.isOptional && (
                            <span className="ml-1.5 text-xs text-stone-300">(optional)</span>
                          )}
                          {item.hasNoApiData && (
                            <span className="ml-1.5 text-xs text-amber-600 font-medium">
                              no market data
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-stone-500 whitespace-nowrap">
                          {formatQty(item.quantity, item.unit)}
                        </td>
                        <td className="py-2 pr-4 text-right text-brand-700 font-medium">
                          <PriceCell cents={item.usdaCents} />
                        </td>
                        <td className="py-2 pr-4 text-right text-stone-500">
                          <PriceCell cents={item.spoonacularCents} />
                        </td>
                        <td className="py-2 pr-4 text-right text-stone-500">
                          <PriceCell cents={item.krogerCents} />
                        </td>
                        <td
                          className={`py-2 pr-4 text-right ${mealMeConfigured ? 'text-emerald-700 font-medium' : 'text-stone-300'}`}
                        >
                          {mealMeConfigured ? (
                            <PriceCell cents={item.mealMeCents} />
                          ) : (
                            <span className="text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2 text-right font-medium text-stone-100">
                          <PriceCell cents={item.averageCents} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-stone-600">
                      <td colSpan={2} className="py-3 font-semibold text-stone-100">
                        Total Estimate
                      </td>
                      <td className="py-3 text-right font-semibold text-brand-700">
                        <PriceCell cents={quote.usdaTotalCents} />
                      </td>
                      <td className="py-3 text-right text-stone-500">
                        <PriceCell cents={quote.spoonacularTotalCents} />
                      </td>
                      <td className="py-3 text-right text-stone-500">
                        <PriceCell cents={quote.krogerTotalCents} />
                      </td>
                      <td
                        className={`py-3 text-right ${mealMeConfigured ? 'font-semibold text-emerald-700' : 'text-stone-300'}`}
                      >
                        {mealMeConfigured ? (
                          <PriceCell cents={quote.mealMeTotalCents} />
                        ) : (
                          <span className="text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 text-right font-bold text-lg text-stone-100">
                        {formatCurrency(quote.averageTotalCents)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Source legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-stone-300 border-t border-stone-800 pt-4">
                <span>
                  <span className="font-medium text-brand-700">USDA (NE)</span> - USDA Northeast
                  Urban average retail prices. Already NE-regional, no API key needed.
                </span>
                <span>
                  <span className="font-medium text-stone-300">Spoonacular / Kroger</span> - US
                  national averages. A Northeast regional multiplier is applied before averaging.
                </span>
                <span>
                  <span
                    className={`font-medium ${mealMeConfigured ? 'text-emerald-700' : 'text-stone-300'}`}
                  >
                    Local Stores (MealMe)
                  </span>{' '}
                  {mealMeConfigured
                    ? "- real-time prices from your nearest stores (Market Basket, Hannaford, Shaw's, Stop & Shop, Whole Foods, Walmart, +1M more)"
                    : '- not configured. Add MEALME_API_KEY to see prices from your actual NE stores.'}
                </span>
                <span>
                  <span className="font-medium text-stone-300">Avg Estimate</span> - NE-calibrated
                  average of all sources. Falls back to Recipe Book if no data found.
                </span>
              </div>
            </Card>

            {/* Budget check */}
            {(quote.budgetCeilingCents || quote.quotedPriceCents) && (
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-stone-300 mb-3">Budget Check</h3>
                <BudgetBar
                  averageCents={quote.averageTotalCents}
                  ceilingCents={quote.budgetCeilingCents}
                  quotedCents={quote.quotedPriceCents}
                />
              </Card>
            )}

            {/* Accuracy check - shown when chef has logged actual grocery spend post-event */}
            {quote.actualGroceryCostCents !== null && (
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-stone-300 mb-3">Accuracy Check</h3>
                <div className="flex gap-6 text-sm mb-3">
                  <div>
                    <p className="text-stone-500 text-xs mb-0.5">Estimated</p>
                    <p className="font-semibold text-stone-100">
                      {formatCurrency(quote.averageTotalCents)}
                    </p>
                  </div>
                  <div>
                    <p className="text-stone-500 text-xs mb-0.5">Actual spent</p>
                    <p className="font-semibold text-stone-100">
                      {formatCurrency(quote.actualGroceryCostCents)}
                    </p>
                  </div>
                  {quote.accuracyDeltaPct !== null && (
                    <div>
                      <p className="text-stone-500 text-xs mb-0.5">Delta</p>
                      <p
                        className={`font-semibold ${Math.abs(quote.accuracyDeltaPct) < 10 ? 'text-emerald-700' : 'text-amber-600'}`}
                      >
                        {quote.accuracyDeltaPct > 0 ? '+' : ''}
                        {quote.accuracyDeltaPct.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-stone-300">
                  Within 10% = good estimate.
                  {quote.accuracyDeltaPct !== null && Math.abs(quote.accuracyDeltaPct) >= 10
                    ? ' Consistent drift in the same direction means the regional multipliers need tuning.'
                    : ' Keep logging actual costs to improve future estimates.'}
                </p>
              </Card>
            )}

            {/* Actions */}
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-stone-300 mb-4">Actions</h3>
              <div className="flex flex-wrap gap-3">
                {/* Instacart */}
                {quote.instacartLink ? (
                  <Button href={quote.instacartLink} target="_blank" rel="noopener noreferrer">
                    Open in Instacart →
                  </Button>
                ) : (
                  <div className="rounded-md border border-stone-700 px-4 py-2.5 text-sm text-stone-500 bg-stone-800">
                    Instacart link unavailable - add INSTACART_API_KEY to enable
                  </div>
                )}

                {/* Save to Recipe Book */}
                <Button
                  variant="secondary"
                  onClick={handleSaveToRecipeBook}
                  disabled={isPending || saved}
                >
                  {saved
                    ? 'Saved to Recipe Book'
                    : isPending
                      ? 'Saving...'
                      : 'Save Prices to Recipe Book'}
                </Button>
              </div>

              {saved && (
                <p className="mt-3 text-sm text-emerald-700">
                  Average prices saved. Future grocery list projections will use these updated
                  prices.
                </p>
              )}

              {quote && !quote.isFromCache && (
                <p className="mt-3 text-sm text-brand-700">
                  Estimate saved to event - visible in Profit Summary.
                </p>
              )}

              <p className="mt-4 text-xs text-stone-300">
                &quot;Save to Recipe Book&quot; updates the <em>last_price_cents</em> field on each
                ingredient, improving future food cost projections. The chef should verify the price
                is reasonable before saving.
              </p>
            </Card>
          </>
        )}
      </div>
      <GroceryLivePricingSidebar eventId={eventId} />
    </div>
  )
}
