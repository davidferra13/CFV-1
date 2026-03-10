'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  calculateParLevels,
  saveParOverrides,
  type ParItem,
  type ParPlanResult,
} from '@/lib/food-truck/par-planning-actions'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ParPlanning() {
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [covers, setCovers] = useState(50)
  const [buffer, setBuffer] = useState(15)
  const [result, setResult] = useState<ParPlanResult | null>(null)
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  function handleCalculate() {
    setError(null)
    startTransition(async () => {
      try {
        const data = await calculateParLevels(date, covers, buffer)
        setResult(data)
        setOverrides({})
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to calculate par levels')
        setResult(null)
      }
    })
  }

  function handleOverride(ingredientId: string, value: string) {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0) {
      setOverrides((prev) => ({ ...prev, [ingredientId]: num }))
    }
  }

  function handleSaveOverrides() {
    if (!result) return
    const overrideList = Object.entries(overrides).map(([ingredientId, quantity]) => ({
      ingredientId,
      quantity,
    }))

    startTransition(async () => {
      try {
        const res = await saveParOverrides(date, overrideList)
        if (res.success) {
          showToast('success', 'Overrides saved')
        } else {
          showToast('error', res.error ?? 'Failed to save overrides')
        }
      } catch {
        showToast('error', 'Failed to save overrides')
      }
    })
  }

  function handleGeneratePrepList() {
    if (!result) return
    // Generate a simple text prep list for printing or sharing
    const items = getDisplayItems()
      .filter((i) => i.needToPrep > 0)
      .map(
        (i) =>
          `[ ] ${i.ingredientName}: ${i.needToPrep.toFixed(1)} ${i.unit} (used in: ${i.usedInRecipes.join(', ')})`
      )
    const text = `PREP LIST - ${date}\nExpected Covers: ${covers}\n\n${items.join('\n')}`

    // Copy to clipboard
    navigator.clipboard.writeText(text).then(
      () => showToast('success', 'Prep list copied to clipboard'),
      () => showToast('error', 'Failed to copy prep list')
    )
  }

  function getDisplayItems(): ParItem[] {
    if (!result) return []
    return result.items.map((item) => {
      if (overrides[item.ingredientId] !== undefined) {
        const overrideQty = overrides[item.ingredientId]
        return {
          ...item,
          needToPrep: overrideQty,
          priority:
            overrideQty <= 0
              ? ('good' as const)
              : overrideQty > item.parLevel * 0.75
                ? ('critical' as const)
                : ('low' as const),
        }
      }
      return item
    })
  }

  const displayItems = getDisplayItems()
  const itemsToPrep = displayItems.filter((i) => i.needToPrep > 0).length

  const priorityColors = {
    critical: 'bg-red-900/30 border-red-800 text-red-300',
    low: 'bg-amber-900/30 border-amber-800 text-amber-300',
    good: 'bg-green-900/30 border-green-800 text-green-300',
  }

  const priorityDotColors = {
    critical: 'bg-red-500',
    low: 'bg-amber-500',
    good: 'bg-green-500',
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Input controls */}
      <Card className="p-5 bg-zinc-900 border-zinc-800">
        <h2 className="text-lg font-semibold text-white mb-4">Calculate Par Levels</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Service Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Expected Covers</label>
            <input
              type="number"
              min="1"
              value={covers}
              onChange={(e) => setCovers(parseInt(e.target.value) || 0)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Buffer %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={buffer}
              onChange={(e) => setBuffer(parseInt(e.target.value) || 0)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button variant="primary" onClick={handleCalculate} disabled={isPending || covers <= 0}>
            {isPending ? 'Calculating...' : 'Calculate Par Levels'}
          </Button>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card className="p-4 bg-red-900/20 border-red-800">
          <p className="text-red-400">{error}</p>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-zinc-900 border-zinc-800 text-center">
              <p className="text-sm text-zinc-400">Items to Prep</p>
              <p className="text-3xl font-bold text-white">{itemsToPrep}</p>
            </Card>
            <Card className="p-4 bg-zinc-900 border-zinc-800 text-center">
              <p className="text-sm text-zinc-400">Total Ingredients</p>
              <p className="text-3xl font-bold text-white">{displayItems.length}</p>
            </Card>
            <Card className="p-4 bg-zinc-900 border-zinc-800 text-center">
              <p className="text-sm text-zinc-400">Est. Prep Time</p>
              <p className="text-3xl font-bold text-white">{result.estimatedPrepMinutes} min</p>
            </Card>
          </div>

          {/* Par table */}
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">
                      Ingredient
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-zinc-400">
                      Par Level
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-zinc-400">
                      Current Stock
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-zinc-400">
                      Need to Prep
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-zinc-400">
                      Priority
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-zinc-400">
                      Override
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                        No ingredients found. Make sure recipes on the menu board have ingredients
                        assigned.
                      </td>
                    </tr>
                  ) : (
                    displayItems.map((item) => (
                      <tr
                        key={item.ingredientId}
                        className={`border-b border-zinc-800/50 ${priorityColors[item.priority]}`}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-medium text-white">{item.ingredientName}</span>
                            <span className="text-xs text-zinc-500 ml-1">({item.unit})</span>
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {item.usedInRecipes.join(', ')}
                          </div>
                        </td>
                        <td className="text-right px-4 py-3 text-white tabular-nums">
                          {item.parLevel.toFixed(1)}
                        </td>
                        <td className="text-right px-4 py-3 text-white tabular-nums">
                          {item.currentStock.toFixed(1)}
                        </td>
                        <td className="text-right px-4 py-3 font-semibold text-white tabular-nums">
                          {item.needToPrep.toFixed(1)}
                        </td>
                        <td className="text-center px-4 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${priorityDotColors[item.priority]}`}
                            />
                            <span className="text-xs uppercase font-medium">{item.priority}</span>
                          </span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={overrides[item.ingredientId] ?? ''}
                            onChange={(e) => handleOverride(item.ingredientId, e.target.value)}
                            placeholder={item.needToPrep.toFixed(1)}
                            className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-sm text-right"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {Object.keys(overrides).length > 0 && (
              <Button variant="secondary" onClick={handleSaveOverrides} disabled={isPending}>
                Save Overrides
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleGeneratePrepList}
              disabled={isPending || itemsToPrep === 0}
            >
              Generate Prep List
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
