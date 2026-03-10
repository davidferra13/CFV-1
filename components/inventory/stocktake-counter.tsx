// Stocktake Counter
// Full-screen counting interface optimized for mobile/tablet.
// Large numeric inputs, +/- buttons, progress indicator, auto-save.

'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { updateCount, batchUpdateCounts } from '@/lib/inventory/stocktake-actions'
import type { StocktakeItem } from '@/lib/inventory/stocktake-actions'

type Props = {
  stocktakeId: string
  stocktakeName: string
  items: StocktakeItem[]
}

export function StocktakeCounter({ stocktakeId, stocktakeName, items }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localItems, setLocalItems] = useState<StocktakeItem[]>(items)
  const [activeIndex, setActiveIndex] = useState(0)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const countedCount = localItems.filter((i) => i.countedQuantity != null).length
  const totalCount = localItems.length
  const progressPercent = totalCount > 0 ? Math.round((countedCount / totalCount) * 100) : 0

  const handleCountChange = useCallback(
    (itemId: string, value: number) => {
      const previous = [...localItems]
      setLocalItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, countedQuantity: value } : i))
      )

      setSaveStatus('saving')
      startTransition(async () => {
        try {
          await updateCount(itemId, value)
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 1500)
        } catch {
          setLocalItems(previous)
          setSaveStatus('error')
          setTimeout(() => setSaveStatus('idle'), 2000)
        }
      })
    },
    [localItems]
  )

  const handleIncrement = (itemId: string, current: number | null) => {
    handleCountChange(itemId, (current ?? 0) + 1)
  }

  const handleDecrement = (itemId: string, current: number | null) => {
    const newVal = Math.max(0, (current ?? 0) - 1)
    handleCountChange(itemId, newVal)
  }

  const handleSkip = () => {
    if (activeIndex < localItems.length - 1) {
      setActiveIndex(activeIndex + 1)
    }
  }

  const handleNext = () => {
    if (activeIndex < localItems.length - 1) {
      setActiveIndex(activeIndex + 1)
    }
  }

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1)
    }
  }

  const handleFinishCounting = () => {
    router.push(`/inventory/stocktake/${stocktakeId}/reconcile`)
  }

  const currentItem = localItems[activeIndex]

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-100">{stocktakeName}</h2>
          <p className="text-sm text-stone-500">
            {countedCount} of {totalCount} items counted ({progressPercent}%)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <span className="text-xs text-stone-500">Saving...</span>}
          {saveStatus === 'saved' && <span className="text-xs text-green-500">Saved</span>}
          {saveStatus === 'error' && <span className="text-xs text-red-500">Save failed</span>}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-stone-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Item list view */}
      <div className="space-y-1 max-h-[200px] overflow-y-auto rounded-lg border border-stone-700 bg-stone-800/50 p-2">
        {localItems.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => setActiveIndex(idx)}
            className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${
              idx === activeIndex
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                : item.countedQuantity != null
                  ? 'text-stone-400 hover:bg-stone-700/50'
                  : 'text-stone-300 hover:bg-stone-700/50'
            }`}
          >
            <span className="truncate">{item.ingredientName}</span>
            <span className="ml-2 flex-shrink-0">
              {item.countedQuantity != null ? (
                <span className="text-green-500 text-xs">
                  {item.countedQuantity} {item.unit}
                </span>
              ) : (
                <span className="text-stone-600 text-xs">not counted</span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Active item counting panel */}
      {currentItem && (
        <div className="rounded-xl border border-stone-700 bg-stone-800 p-6 space-y-6">
          <div className="text-center">
            <p className="text-stone-500 text-sm">
              Item {activeIndex + 1} of {totalCount}
            </p>
            <h3 className="text-2xl font-bold text-stone-100 mt-1">{currentItem.ingredientName}</h3>
            <p className="text-stone-500 text-sm mt-1">
              Expected: {currentItem.expectedQuantity} {currentItem.unit}
            </p>
          </div>

          {/* Large count input */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleDecrement(currentItem.id, currentItem.countedQuantity)}
              className="h-14 w-14 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 text-2xl font-bold flex items-center justify-center transition-colors"
              disabled={isPending}
            >
              -
            </button>

            <input
              type="number"
              inputMode="decimal"
              value={currentItem.countedQuantity ?? ''}
              placeholder="0"
              onChange={(e) => {
                const val = e.target.value
                if (val === '') return
                handleCountChange(currentItem.id, Number(val))
              }}
              className="h-16 w-32 rounded-xl bg-stone-900 border border-stone-600 text-center text-3xl font-bold text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />

            <button
              onClick={() => handleIncrement(currentItem.id, currentItem.countedQuantity)}
              className="h-14 w-14 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 text-2xl font-bold flex items-center justify-center transition-colors"
              disabled={isPending}
            >
              +
            </button>
          </div>

          <p className="text-center text-sm text-stone-500">{currentItem.unit}</p>

          {/* Quick set to expected */}
          <div className="flex justify-center">
            <button
              onClick={() => handleCountChange(currentItem.id, currentItem.expectedQuantity)}
              className="text-sm text-brand-400 hover:text-brand-300 underline"
            >
              Set to expected ({currentItem.expectedQuantity})
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handlePrev}
              disabled={activeIndex === 0}
              className="px-4 py-2 rounded-lg text-sm text-stone-400 hover:text-stone-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <button
              onClick={handleSkip}
              className="px-4 py-2 rounded-lg text-sm text-stone-500 hover:text-stone-300"
            >
              Skip
            </button>

            {activeIndex < totalCount - 1 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm hover:bg-brand-600"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleFinishCounting}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
              >
                Finish Counting
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => router.push('/inventory/stocktake')}
          className="text-sm text-stone-500 hover:text-stone-300"
        >
          Save & Exit
        </button>
        <button
          onClick={handleFinishCounting}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm hover:bg-brand-600"
        >
          Go to Reconciliation
        </button>
      </div>
    </div>
  )
}
