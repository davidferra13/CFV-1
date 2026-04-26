'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  getShoppingOptimizationAdmin,
  type ShoppingOptResult,
} from '@/lib/openclaw/catalog-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { hasPricingCoverage } from '@/lib/pricing/coverage-check'
import { useFormatContext } from '@/lib/hooks/use-format-context'
import { ListChecks, X, Check } from '@/components/ui/icons'

interface BulkPriceCheckerProps {
  onFilterByIngredient?: (name: string) => void
}

export function BulkPriceChecker({ onFilterByIngredient }: BulkPriceCheckerProps) {
  const fmtCtx = useFormatContext()
  const [text, setText] = useState('')
  const [result, setResult] = useState<ShoppingOptResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!hasPricingCoverage(fmtCtx.currency)) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-600">
          Automated pricing is available for USD regions. Enter your ingredient costs manually on
          each recipe.
        </p>
      </div>
    )
  }

  function handleCheck() {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    if (lines.length === 0) return

    const capped = lines.slice(0, 200)
    if (lines.length > 200) {
      setError('Checking first 200 items (batch limit)')
    }

    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const res = await getShoppingOptimizationAdmin(capped)
        if (res) {
          setResult(res)
        } else {
          setError('No response from price API. Check that the Pi is online.')
        }
      } catch {
        setError('Failed to check prices. Pi may be offline.')
      }
    })
  }

  function handleClear() {
    setText('')
    setResult(null)
    setError(null)
  }

  const totalCents = result?.optimal?.items?.reduce((sum, item) => sum + item.priceCents, 0) ?? 0

  return (
    <div className="border border-stone-700 rounded-lg p-4 space-y-3 bg-stone-900/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-stone-200">
          <ListChecks className="w-4 h-4" />
          Bulk Price Checker
        </div>
        <button onClick={handleClear} className="text-xs text-stone-500 hover:text-stone-300">
          Clear
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste ingredient names, one per line..."
        rows={6}
        className="w-full bg-stone-800 border border-stone-700 rounded-md px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 resize-y"
      />

      <div className="flex gap-2">
        <Button size="sm" onClick={handleCheck} disabled={isPending || !text.trim()}>
          {isPending ? 'Checking...' : 'Check Prices'}
        </Button>
      </div>

      {error && <p className="text-xs text-amber-400">{error}</p>}

      {isPending && !result && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 loading-bone loading-bone-muted rounded" />
          ))}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Item results */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-stone-700">
                  <th className="text-left py-1.5 px-2 text-stone-400 font-medium">Ingredient</th>
                  <th className="text-right py-1.5 px-2 text-stone-400 font-medium">Best Price</th>
                  <th className="text-left py-1.5 px-2 text-stone-400 font-medium">Store</th>
                  <th className="text-center py-1.5 px-2 text-stone-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.optimal.items.map((item, i) => (
                  <tr key={i} className="border-b border-stone-800">
                    <td className="py-1.5 px-2">
                      <button
                        onClick={() => onFilterByIngredient?.(item.name)}
                        className="text-stone-200 hover:text-blue-400 hover:underline cursor-pointer"
                      >
                        {item.name}
                      </button>
                    </td>
                    <td className="py-1.5 px-2 text-right text-stone-200 font-medium">
                      {formatCurrency(item.priceCents)}
                    </td>
                    <td className="py-1.5 px-2 text-stone-400">{item.store}</td>
                    <td className="py-1.5 px-2 text-center">
                      <Check className="w-3.5 h-3.5 text-emerald-400 inline-block" />
                    </td>
                  </tr>
                ))}
                {result.notFound > 0 && (
                  <tr className="border-b border-stone-800">
                    <td className="py-1.5 px-2 text-stone-500" colSpan={3}>
                      {result.notFound} item{result.notFound > 1 ? 's' : ''} not found
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <X className="w-3.5 h-3.5 text-red-400 inline-block" />
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone-600">
                  <td className="py-2 px-2 font-medium text-stone-200">
                    Total ({result.found} found)
                  </td>
                  <td className="py-2 px-2 text-right font-bold text-stone-100">
                    {formatCurrency(totalCents)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Single store comparison */}
          {result.singleStoreRanking && result.singleStoreRanking.length > 0 && (
            <div>
              <p className="text-xs font-medium text-stone-400 mb-1">Single-store totals</p>
              <div className="space-y-1">
                {result.singleStoreRanking.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-stone-300">{s.store}</span>
                    <span className="text-stone-400">
                      {s.totalDisplay} ({s.available}/{s.available + s.missing} items)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
