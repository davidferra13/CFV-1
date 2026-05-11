'use client'

import { useState, useCallback, useTransition } from 'react'
import { GrocerySection } from '@/components/mobile/grocery-section'
import { GroceryProgressBar } from '@/components/mobile/grocery-progress-bar'
import { ReceiptLogger } from '@/components/mobile/receipt-logger'
import { checkOffItem } from '@/lib/mobile/grocery-run-actions'
import type { GroceryRunData } from '@/lib/mobile/grocery-run'

interface GroceryRunClientProps {
  initialData: GroceryRunData
}

export function GroceryRunClient({ initialData }: GroceryRunClientProps) {
  const [data, setData] = useState(initialData)
  const [showReceipt, setShowReceipt] = useState(false)
  const [, startTransition] = useTransition()

  // Optimistic toggle with server sync
  const handleToggle = useCallback(
    (ingredientId: string, checked: boolean) => {
      // Optimistic update
      setData((prev) => {
        const next = { ...prev }
        next.sections = prev.sections.map((section) => ({
          ...section,
          items: section.items.map((item) =>
            item.ingredientId === ingredientId ? { ...item, checked } : item
          ),
          checkedCount:
            section.checkedCount +
            (section.items.some((i) => i.ingredientId === ingredientId)
              ? checked
                ? 1
                : -1
              : 0),
        }))
        next.checkedCount = prev.checkedCount + (checked ? 1 : -1)
        return next
      })

      // Sync to server
      startTransition(async () => {
        try {
          await checkOffItem(data.eventId, ingredientId, checked)
        } catch (err) {
          // Rollback on failure
          console.error('[GroceryRun] Check-off failed:', err)
          setData((prev) => {
            const next = { ...prev }
            next.sections = prev.sections.map((section) => ({
              ...section,
              items: section.items.map((item) =>
                item.ingredientId === ingredientId ? { ...item, checked: !checked } : item
              ),
              checkedCount:
                section.checkedCount +
                (section.items.some((i) => i.ingredientId === ingredientId)
                  ? checked
                    ? -1
                    : 1
                  : 0),
            }))
            next.checkedCount = prev.checkedCount + (checked ? -1 : 1)
            return next
          })
        }
      })
    },
    [data.eventId]
  )

  const handleReceiptSuccess = useCallback(() => {
    setShowReceipt(false)
  }, [])

  // Empty state
  if (data.sections.length === 0) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-stone-400 text-lg mb-2">No items on the list</p>
          <p className="text-stone-500 text-sm mb-4">
            Add a menu with recipes to this event to generate a grocery list.
          </p>
          <a
            href={`/events/${data.eventId}`}
            className="inline-block px-4 py-2 bg-stone-800 text-stone-300 rounded-lg text-sm"
          >
            Back to Event
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-stone-950 border-b border-stone-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <a
            href={`/events/${data.eventId}`}
            title="Back to event"
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-stone-800 active:bg-stone-700"
          >
            <svg className="w-5 h-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="sr-only">Back to event</span>
          </a>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-stone-100 truncate">
              {data.eventName}
            </h1>
            <p className="text-xs text-stone-500">
              {data.guestCount} guests
              {data.eventDate && ` \u00B7 ${data.eventDate}`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <GroceryProgressBar total={data.totalItems} checked={data.checkedCount} />
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto pb-24">
        {data.sections.map((section) => (
          <GrocerySection
            key={section.section}
            section={section}
            onToggleItem={handleToggle}
          />
        ))}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-stone-900/95 backdrop-blur border-t border-stone-700 px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-stone-400">
          <span className="text-emerald-400 font-semibold">{data.checkedCount}</span>
          <span> / {data.totalItems} items</span>
        </div>
        <button
          type="button"
          onClick={() => setShowReceipt(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-stone-950 rounded-lg text-sm font-semibold active:bg-amber-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
          Log Receipt
        </button>
      </div>

      {/* Receipt modal */}
      {showReceipt && (
        <ReceiptLogger
          eventId={data.eventId}
          onClose={() => setShowReceipt(false)}
          onSuccess={handleReceiptSuccess}
        />
      )}
    </div>
  )
}
