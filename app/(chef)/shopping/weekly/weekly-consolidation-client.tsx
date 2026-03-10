'use client'

// Weekly Shopping Consolidation Client
// Date range picker and consolidated shopping list view.
// Allows chefs to see a combined list from all events in a given week.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'sonner'
import {
  getConsolidatedShoppingList,
  createConsolidatedList,
  type ConsolidatedShoppingData,
} from '@/lib/shopping/consolidation-actions'

function getWeekBounds(date: Date): { start: string; end: string } {
  const d = new Date(date)
  const day = d.getDay()
  // Monday = start of week
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function WeeklyConsolidationView() {
  const router = useRouter()
  const now = new Date()
  const defaultWeek = getWeekBounds(now)

  const [startDate, setStartDate] = useState(defaultWeek.start)
  const [endDate, setEndDate] = useState(defaultWeek.end)
  const [data, setData] = useState<ConsolidatedShoppingData | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [loading, startLoadTransition] = useTransition()
  const [creating, startCreateTransition] = useTransition()

  function handleLoad() {
    setError(null)
    startLoadTransition(async () => {
      try {
        const result = await getConsolidatedShoppingList(startDate, endDate)
        setData(result)
        setCheckedItems(new Set())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load consolidated data')
        setData(null)
      }
    })
  }

  function handleCreateList() {
    startCreateTransition(async () => {
      try {
        const result = await createConsolidatedList(startDate, endDate)
        toast.success('Consolidated shopping list created')
        router.push(`/shopping/${result.id}`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create list')
      }
    })
  }

  function toggleItem(key: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Group items by category
  const groupedItems = data?.consolidatedItems.reduce(
    (groups, item) => {
      const cat = item.category || 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
      return groups
    },
    {} as Record<string, typeof data.consolidatedItems>
  )

  const totalItems = data?.consolidatedItems.length ?? 0
  const checkedCount = checkedItems.size

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Select Date Range
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm text-stone-400 block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm text-stone-400 block mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
            />
          </div>
          <Button onClick={handleLoad} disabled={loading || !startDate || !endDate}>
            {loading ? 'Loading...' : 'View Combined List'}
          </Button>
        </div>
        {/* Quick buttons */}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            className="text-xs text-brand-600 hover:text-brand-400 underline"
            onClick={() => {
              const thisWeek = getWeekBounds(now)
              setStartDate(thisWeek.start)
              setEndDate(thisWeek.end)
            }}
          >
            This Week
          </button>
          <button
            type="button"
            className="text-xs text-brand-600 hover:text-brand-400 underline"
            onClick={() => {
              const next = new Date(now)
              next.setDate(next.getDate() + 7)
              const nextWeek = getWeekBounds(next)
              setStartDate(nextWeek.start)
              setEndDate(nextWeek.end)
            }}
          >
            Next Week
          </button>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-950 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Events in Range */}
      {data && (
        <>
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Events: {formatDateShort(data.startDate)} to {formatDateShort(data.endDate)}
            </h2>
            {data.events.length === 0 ? (
              <p className="text-sm text-stone-400">No events found in this date range.</p>
            ) : (
              <div className="space-y-2">
                {data.events.map((ev) => (
                  <div
                    key={ev.eventId}
                    className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-900 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-100">{ev.occasion}</p>
                      <p className="text-xs text-stone-500">
                        {formatDateShort(ev.eventDate)}
                        {ev.clientName ? ` - ${ev.clientName}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {ev.hasShoppingList ? (
                        <Badge variant="success">{ev.itemCount} items</Badge>
                      ) : (
                        <Badge variant="warning">No list</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Consolidated List */}
          {data.consolidatedItems.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-100">Combined Shopping List</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {totalItems} unique items from{' '}
                    {data.events.filter((e) => e.hasShoppingList).length} event
                    {data.events.filter((e) => e.hasShoppingList).length !== 1 ? 's' : ''}
                    {data.totalEstimatedCents > 0 &&
                      ` - Est. ${formatCurrency(data.totalEstimatedCents)}`}
                  </p>
                </div>
                <Button variant="primary" onClick={handleCreateList} disabled={creating}>
                  {creating ? 'Creating...' : 'Save as Shopping List'}
                </Button>
              </div>

              {/* Progress bar */}
              {checkedCount > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>
                      {checkedCount} of {totalItems} checked
                    </span>
                    <span>{Math.round((checkedCount / totalItems) * 100)}%</span>
                  </div>
                  <div className="w-full bg-stone-700 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${(checkedCount / totalItems) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Items grouped by category */}
              {groupedItems &&
                Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category} className="mb-4">
                    <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-2">
                      {category}
                    </h3>
                    <div className="space-y-1">
                      {items.map((item) => {
                        const key = `${item.name}|${item.unit ?? ''}`
                        const isChecked = checkedItems.has(key)

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleItem(key)}
                            className={`w-full text-left flex items-start gap-3 rounded-lg px-3 py-2 transition ${
                              isChecked
                                ? 'bg-stone-800/50 opacity-60'
                                : 'bg-stone-900 hover:bg-stone-800'
                            }`}
                          >
                            {/* Checkbox */}
                            <div
                              className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${
                                isChecked ? 'bg-emerald-600 border-emerald-600' : 'border-stone-600'
                              }`}
                            >
                              {isChecked && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>

                            {/* Item details */}
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium ${
                                  isChecked ? 'line-through text-stone-500' : 'text-stone-100'
                                }`}
                              >
                                {item.name}
                              </p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                <span className="text-xs text-stone-500">
                                  {item.totalQuantity}
                                  {item.unit ? ` ${item.unit}` : ''}
                                </span>
                                {item.eventSources.length > 1 && (
                                  <span className="text-xs text-amber-500">
                                    {item.eventSources.length} events
                                  </span>
                                )}
                                {item.estimatedPriceCents != null &&
                                  item.estimatedPriceCents > 0 && (
                                    <span className="text-xs text-stone-500">
                                      ~{formatCurrency(item.estimatedPriceCents)}
                                    </span>
                                  )}
                              </div>
                              {/* Show which events need this item */}
                              {item.eventSources.length > 1 && (
                                <p className="text-xs text-stone-600 mt-0.5">
                                  {item.eventSources
                                    .map(
                                      (s) =>
                                        `${s.occasion} (${s.quantity}${item.unit ? ` ${item.unit}` : ''})`
                                    )
                                    .join(', ')}
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </Card>
          )}

          {data.consolidatedItems.length === 0 && data.events.length > 0 && (
            <Card className="p-6 text-center">
              <p className="text-sm text-stone-400">
                No shopping list items found. Create shopping lists for your events first, then come
                back here to combine them.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
