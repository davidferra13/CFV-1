'use client'

// PrepChecklistMobile - Full-screen mobile prep day checklist.
// Scrollable list of make-ahead components grouped by category,
// with large touch targets and optimistic completion tracking.
// Reuses patterns from DOP mobile view.

import { useState, useTransition } from 'react'
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Check,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { togglePrepItem, markAllPrepComplete } from '@/lib/scheduling/prep-checklist-actions'
import { toast } from 'sonner'
import type { PrepItem } from '@/lib/scheduling/prep-checklist-actions'
import Link from 'next/link'

// Category display config: label + color
const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  sauce: { label: 'Sauce', bg: 'bg-red-950', text: 'text-red-400' },
  protein: { label: 'Protein', bg: 'bg-amber-950', text: 'text-amber-400' },
  starch: { label: 'Starch', bg: 'bg-yellow-950', text: 'text-yellow-400' },
  vegetable: { label: 'Vegetable', bg: 'bg-green-950', text: 'text-green-400' },
  fruit: { label: 'Fruit', bg: 'bg-pink-950', text: 'text-pink-400' },
  dessert: { label: 'Dessert', bg: 'bg-purple-950', text: 'text-purple-400' },
  garnish: { label: 'Garnish', bg: 'bg-emerald-950', text: 'text-emerald-400' },
  bread: { label: 'Bread', bg: 'bg-orange-950', text: 'text-orange-400' },
  cheese: { label: 'Cheese', bg: 'bg-yellow-950', text: 'text-yellow-500' },
  condiment: { label: 'Condiment', bg: 'bg-lime-950', text: 'text-lime-400' },
  beverage: { label: 'Beverage', bg: 'bg-sky-950', text: 'text-sky-400' },
  other: { label: 'Other', bg: 'bg-stone-800', text: 'text-stone-400' },
}

interface PrepChecklistMobileProps {
  eventId: string
  items: PrepItem[]
  completedIds: Set<string>
  eventTitle: string
  eventDate: string
}

export function PrepChecklistMobile({
  eventId,
  items,
  completedIds: initialCompletedIds,
  eventTitle,
  eventDate,
}: PrepChecklistMobileProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(initialCompletedIds)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [allMarked, setAllMarked] = useState(false)

  const completedCount = items.filter((item) => completedIds.has(item.componentId)).length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const allComplete = completedCount === totalCount && totalCount > 0

  // Group items by category
  const grouped = items.reduce<Record<string, PrepItem[]>>((acc, item) => {
    const key = item.category || 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  // Sort categories by the order they appear in the items list
  const categoryOrder = Object.keys(grouped)

  function handleToggle(componentId: string) {
    const wasComplete = completedIds.has(componentId)

    // Optimistic update
    setCompletedIds((prev) => {
      const next = new Set(prev)
      if (wasComplete) {
        next.delete(componentId)
      } else {
        next.add(componentId)
      }
      return next
    })

    startTransition(async () => {
      try {
        await togglePrepItem(eventId, componentId)
        if (!wasComplete) {
          // Check if this was the last one
          const newCount = completedCount + 1
          if (newCount === totalCount) {
            toast.success('All prep items complete!')
          }
        }
      } catch {
        // Revert on error
        setCompletedIds((prev) => {
          const next = new Set(prev)
          if (wasComplete) {
            next.add(componentId)
          } else {
            next.delete(componentId)
          }
          return next
        })
        toast.error('Failed to save. Check your connection.')
      }
    })
  }

  function toggleExpanded(componentId: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(componentId)) {
        next.delete(componentId)
      } else {
        next.add(componentId)
      }
      return next
    })
  }

  function handleMarkAllComplete() {
    startTransition(async () => {
      try {
        await markAllPrepComplete(eventId)
        setAllMarked(true)
        toast.success('Prep marked as complete!')
      } catch {
        toast.error('Failed to mark prep complete.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-stone-800 flex flex-col">
      {/* Header */}
      <div className="bg-stone-900 text-white px-4 pt-6 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-1">
          <Link
            href={`/events/${eventId}`}
            className="text-stone-400 hover:text-stone-200 p-1 -ml-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{eventTitle}</h1>
            <p className="text-stone-400 text-sm">Prep Day Checklist · {eventDate}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-stone-400 mb-1">
            <span>
              {completedCount} of {totalCount} prepped
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-stone-700 rounded-full h-2.5">
            <div
              className={`rounded-full h-2.5 transition-all duration-300 ${
                allComplete ? 'bg-green-500' : 'bg-brand-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto pb-32">
        {totalCount === 0 ? (
          <div className="p-8 text-center">
            <p className="text-stone-400 font-medium">No make-ahead items found.</p>
            <p className="text-sm text-stone-500 mt-1">
              This event's menu has no components marked as make-ahead.
            </p>
            <Link
              href={`/events/${eventId}`}
              className="inline-block mt-4 text-sm text-brand-400 hover:text-brand-300"
            >
              Back to event
            </Link>
          </div>
        ) : (
          categoryOrder.map((category) => {
            const categoryItems = grouped[category]
            const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other
            const categoryCompleted = categoryItems.filter((i) =>
              completedIds.has(i.componentId)
            ).length

            return (
              <div key={category} className="border-b border-stone-700">
                {/* Category header */}
                <div className={`px-4 py-2.5 flex items-center justify-between ${config.bg}`}>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${config.text}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-stone-500">
                    {categoryCompleted}/{categoryItems.length}
                  </span>
                </div>

                {/* Items */}
                {categoryItems.map((item) => {
                  const isComplete = completedIds.has(item.componentId)
                  const isExpanded = expandedItems.has(item.componentId)
                  const hasDetails = !!(item.storageNotes || item.executionNotes)
                  const leadTimeLabel = item.makeAheadWindowHours
                    ? item.makeAheadWindowHours >= 24
                      ? `${Math.round(item.makeAheadWindowHours / 24)}d ahead`
                      : `${item.makeAheadWindowHours}h ahead`
                    : null

                  return (
                    <div
                      key={item.componentId}
                      className={`border-b border-stone-700/50 ${
                        isComplete ? 'bg-stone-800/50' : 'bg-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4 py-0">
                        {/* Checkbox - 48px+ touch target */}
                        <button
                          onClick={() => handleToggle(item.componentId)}
                          disabled={isPending}
                          className="flex-shrink-0 p-2.5 -ml-2.5 touch-manipulation"
                          aria-label={
                            isComplete
                              ? `Mark ${item.componentName} as not done`
                              : `Mark ${item.componentName} as done`
                          }
                        >
                          {isComplete ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : (
                            <Circle className="h-6 w-6 text-stone-500" />
                          )}
                        </button>

                        {/* Content */}
                        <div
                          className="flex-1 min-w-0 py-3 cursor-pointer"
                          onClick={() => hasDetails && toggleExpanded(item.componentId)}
                        >
                          <p
                            className={`text-sm font-medium ${
                              isComplete ? 'line-through text-stone-500' : 'text-stone-200'
                            }`}
                          >
                            {item.componentName}
                          </p>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {item.dishName}
                            {item.courseName && item.courseName !== 'Other'
                              ? ` · ${item.courseName}`
                              : ''}
                          </p>
                        </div>

                        {/* Lead time badge + expand */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {leadTimeLabel && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-700 text-stone-400">
                              {leadTimeLabel}
                            </span>
                          )}
                          {hasDetails && (
                            <button
                              onClick={() => toggleExpanded(item.componentId)}
                              className="p-2 -mr-2 touch-manipulation text-stone-500"
                              aria-label="Toggle details"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && hasDetails && (
                        <div className="px-4 pb-3 pl-14 space-y-1.5">
                          {item.storageNotes && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-stone-600 font-medium">
                                Storage
                              </p>
                              <p className="text-xs text-stone-400">{item.storageNotes}</p>
                            </div>
                          )}
                          {item.executionNotes && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-stone-600 font-medium">
                                Notes
                              </p>
                              <p className="text-xs text-stone-400">{item.executionNotes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      {/* Footer: Mark All Complete */}
      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-stone-900 border-t border-stone-700 p-4 z-10">
          {allMarked || allComplete ? (
            <div className="flex items-center justify-center gap-2 py-3 text-green-400">
              <Check className="h-5 w-5" />
              <span className="font-semibold">All prep complete</span>
            </div>
          ) : (
            <Button
              variant="primary"
              className="w-full py-4 text-base"
              onClick={handleMarkAllComplete}
              disabled={isPending || !allComplete}
            >
              {allComplete
                ? 'Mark All Prep Complete'
                : `${totalCount - completedCount} item${totalCount - completedCount !== 1 ? 's' : ''} remaining`}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
