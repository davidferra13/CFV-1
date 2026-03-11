'use client'

import { useState, useTransition } from 'react'
import {
  type LoadOutChecklist,
  type LoadOutItem,
  generateLoadOut,
  toggleLoadOutItem,
  markLoadOutReady,
  getLoadOutForDate,
} from '@/lib/food-truck/commissary-actions'

const CATEGORY_LABELS: Record<string, string> = {
  ingredients: 'Ingredients',
  prepped: 'Prepped Items',
  equipment: 'Equipment',
  supplies: 'Supplies',
}

const CATEGORY_ORDER: string[] = ['ingredients', 'prepped', 'equipment', 'supplies']

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function CommissaryLoadout({
  initialChecklist,
  initialDate,
}: {
  initialChecklist: LoadOutChecklist | null
  initialDate: string
}) {
  const [date, setDate] = useState(initialDate)
  const [checklist, setChecklist] = useState<LoadOutChecklist | null>(initialChecklist)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const totalItems = checklist?.items.length ?? 0
  const checkedItems = checklist?.items.filter((i) => i.checked).length ?? 0
  const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0
  const allLoaded = totalItems > 0 && checkedItems === totalItems

  function handleDateChange(newDate: string) {
    setDate(newDate)
    setError(null)

    startTransition(async () => {
      try {
        const data = await getLoadOutForDate(newDate)
        setChecklist(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load checklist')
      }
    })
  }

  function handleGenerate() {
    setError(null)

    startTransition(async () => {
      try {
        const data = await generateLoadOut(date)
        setChecklist(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate load-out')
      }
    })
  }

  function handleToggle(itemId: string, checked: boolean) {
    setError(null)

    // Optimistic update
    const previous = checklist
    if (checklist) {
      setChecklist({
        ...checklist,
        items: checklist.items.map((item) => (item.id === itemId ? { ...item, checked } : item)),
      })
    }

    startTransition(async () => {
      try {
        await toggleLoadOutItem(date, itemId, checked)
      } catch (err) {
        setChecklist(previous)
        setError(err instanceof Error ? err.message : 'Failed to update item')
      }
    })
  }

  function handleMarkReady() {
    setError(null)

    const previous = checklist
    if (checklist) {
      setChecklist({
        ...checklist,
        items: checklist.items.map((item) => ({ ...item, checked: true })),
        ready: true,
      })
    }

    startTransition(async () => {
      try {
        await markLoadOutReady(date)
      } catch (err) {
        setChecklist(previous)
        setError(err instanceof Error ? err.message : 'Failed to mark as ready')
      }
    })
  }

  function getItemsByCategory(category: string): LoadOutItem[] {
    return checklist?.items.filter((i) => i.category === category) ?? []
  }

  return (
    <div className="space-y-4">
      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-200 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Date picker + generate */}
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
        </div>
        <div className="pt-5">
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Generating...' : checklist ? 'Regenerate Load-Out' : 'Generate Load-Out'}
          </button>
        </div>
        {checklist && (
          <div className="pt-5 text-sm text-zinc-500 dark:text-zinc-400">{formatDate(date)}</div>
        )}
      </div>

      {/* No checklist state */}
      {!checklist && !isPending && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-zinc-500 dark:text-zinc-400">
            No load-out checklist for this date. Hit "Generate Load-Out" to create one based on your
            schedule.
          </p>
        </div>
      )}

      {/* Checklist */}
      {checklist && (
        <>
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                {checkedItems} of {totalItems} items loaded
              </span>
              <span
                className={`font-medium ${
                  allLoaded
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {progressPercent}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  allLoaded ? 'bg-green-500' : progressPercent > 50 ? 'bg-amber-500' : 'bg-zinc-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Categorized items */}
          <div className="space-y-4">
            {CATEGORY_ORDER.map((category) => {
              const items = getItemsByCategory(category)
              if (items.length === 0) return null
              const categoryChecked = items.filter((i) => i.checked).length
              const categoryTotal = items.length

              return (
                <div
                  key={category}
                  className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2 dark:border-zinc-700">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {CATEGORY_LABELS[category] ?? category}
                    </h3>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {categoryChecked}/{categoryTotal}
                    </span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                    {items.map((item) => (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => handleToggle(item.id, e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500 dark:border-zinc-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm ${
                              item.checked
                                ? 'text-zinc-400 line-through dark:text-zinc-500'
                                : 'text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            {item.name}
                          </div>
                          {item.notes && (
                            <div className="text-xs text-zinc-400 dark:text-zinc-500">
                              {item.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {item.quantity}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Ready button */}
          <div className="pt-2">
            {allLoaded ? (
              <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-center dark:border-green-700 dark:bg-green-900/20">
                <p className="text-lg font-semibold text-green-200 dark:text-green-400">
                  All Loaded - Ready to Roll!
                </p>
                <p className="mt-1 text-sm text-green-600 dark:text-green-500">
                  Everything is checked off. Time to hit the road.
                </p>
              </div>
            ) : (
              <button
                onClick={handleMarkReady}
                disabled={isPending}
                className="w-full rounded-lg border-2 border-green-500 bg-green-50 px-4 py-3 text-sm font-semibold text-green-200 hover:bg-green-100 disabled:opacity-50 dark:border-green-600 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
              >
                Mark All Loaded - Ready to Roll
              </button>
            )}
          </div>
        </>
      )}

      {/* Loading overlay */}
      {isPending && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
          Updating...
        </div>
      )}
    </div>
  )
}
