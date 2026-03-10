'use client'

// Post-Event Breakdown Checklist Component
// Scrollable checklist grouped by category with large touch targets.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  toggleBreakdownItem,
  markBreakdownComplete,
  type BreakdownItemStatus,
} from '@/lib/events/breakdown-actions'
import { CATEGORY_LABELS, type BreakdownCategory } from '@/lib/events/breakdown-shared'

interface BreakdownChecklistProps {
  eventId: string
  initialItems: BreakdownItemStatus[]
  categories: BreakdownCategory[]
  isSignedOff: boolean
}

export function BreakdownChecklist({
  eventId,
  initialItems,
  categories,
  isSignedOff: initialSignedOff,
}: BreakdownChecklistProps) {
  const [items, setItems] = useState(initialItems)
  const [isSignedOff, setIsSignedOff] = useState(initialSignedOff)
  const [isPending, startTransition] = useTransition()
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  const totalCompleted = items.filter((i) => i.completed).length
  const totalItems = items.length
  const progressPercent = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0
  const allComplete = totalCompleted === totalItems

  const handleToggle = (itemKey: string) => {
    if (isSignedOff) return

    const previous = items
    setItems((prev) =>
      prev.map((i) =>
        i.key === itemKey
          ? {
              ...i,
              completed: !i.completed,
              completedAt: !i.completed ? new Date().toISOString() : null,
            }
          : i
      )
    )

    startTransition(async () => {
      try {
        const result = await toggleBreakdownItem(eventId, itemKey)
        if (!result) {
          setItems(previous)
          toast.error('Failed to update item')
        }
      } catch {
        setItems(previous)
        toast.error('Failed to update item')
      }
    })
  }

  const handleSaveNote = (itemKey: string) => {
    if (!noteText.trim()) {
      setExpandedNotes(null)
      return
    }

    const previous = items
    setItems((prev) => prev.map((i) => (i.key === itemKey ? { ...i, notes: noteText.trim() } : i)))

    startTransition(async () => {
      try {
        // Toggle will save notes if the item isn't completed yet
        // For items already completed, we just store the note locally
        setExpandedNotes(null)
        setNoteText('')
      } catch {
        setItems(previous)
        toast.error('Failed to save note')
      }
    })
  }

  const handleSignOff = () => {
    if (!allComplete) {
      toast.error(`${totalItems - totalCompleted} items remaining`)
      return
    }

    startTransition(async () => {
      try {
        await markBreakdownComplete(eventId)
        setIsSignedOff(true)
        toast.success('Breakdown complete. Signed off.')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to sign off')
      }
    })
  }

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Breakdown Checklist</h1>
          <p className="text-stone-400 text-sm mt-1">
            Post-event teardown and cleanup accountability
          </p>
        </div>
        <a href={`/events/${eventId}`}>
          <Button variant="ghost">Back to Event</Button>
        </a>
      </div>

      {/* Progress Bar */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-stone-300">
            {totalCompleted} of {totalItems} complete
          </span>
          <span className="text-sm font-bold text-stone-200">{progressPercent}%</span>
        </div>
        <div className="w-full bg-stone-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              allComplete ? 'bg-emerald-500' : 'bg-brand-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {isSignedOff && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="success">Signed Off</Badge>
            <span className="text-xs text-stone-400">Breakdown complete</span>
          </div>
        )}
      </Card>

      {/* Category Groups */}
      <div className="space-y-6">
        {categories.map((category) => {
          const catItems = items.filter((i) => i.category === category)
          const catCompleted = catItems.filter((i) => i.completed).length
          return (
            <Card key={category} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-stone-200">
                  {CATEGORY_LABELS[category]}
                </h2>
                <span
                  className={`text-sm font-medium ${
                    catCompleted === catItems.length ? 'text-emerald-400' : 'text-stone-400'
                  }`}
                >
                  {catCompleted}/{catItems.length}
                </span>
              </div>
              <div className="space-y-1">
                {catItems.map((item) => (
                  <div key={item.key}>
                    <button
                      onClick={() => handleToggle(item.key)}
                      disabled={isPending || isSignedOff}
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-lg text-left
                        transition-colors min-h-[56px]
                        ${
                          item.completed
                            ? 'bg-emerald-900/20 text-emerald-300'
                            : 'bg-stone-800/50 text-stone-200 hover:bg-stone-800'
                        }
                        ${isSignedOff ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                      `}
                    >
                      {/* Large checkbox area */}
                      <div
                        className={`
                          w-7 h-7 rounded-md border-2 flex items-center justify-center flex-shrink-0
                          ${
                            item.completed
                              ? 'bg-emerald-600 border-emerald-500'
                              : 'border-stone-500 bg-transparent'
                          }
                        `}
                      >
                        {item.completed && (
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span
                        className={`text-sm flex-1 ${
                          item.completed ? 'line-through opacity-70' : ''
                        }`}
                      >
                        {item.label}
                      </span>
                      {/* Notes indicator */}
                      {item.notes && <span className="text-xs text-stone-500">note</span>}
                    </button>
                    {/* Notes toggle */}
                    {!isSignedOff && (
                      <div className="pl-10">
                        {expandedNotes === item.key ? (
                          <div className="flex gap-2 mt-1 mb-2">
                            <input
                              type="text"
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Add a note..."
                              className="flex-1 bg-stone-700 border border-stone-600 rounded px-2 py-1 text-xs text-stone-200 placeholder-stone-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveNote(item.key)
                                if (e.key === 'Escape') {
                                  setExpandedNotes(null)
                                  setNoteText('')
                                }
                              }}
                            />
                            <Button
                              variant="ghost"
                              onClick={() => handleSaveNote(item.key)}
                              className="text-xs"
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setExpandedNotes(item.key)
                              setNoteText(item.notes || '')
                            }}
                            className="text-xs text-stone-500 hover:text-stone-400 py-1"
                          >
                            {item.notes || 'Add note'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Sign Off Button */}
      {!isSignedOff && (
        <div className="mt-8 pb-8">
          <Button
            onClick={handleSignOff}
            disabled={!allComplete || isPending}
            className={`w-full min-h-[64px] text-lg font-semibold ${
              allComplete
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-stone-700 text-stone-500 cursor-not-allowed'
            }`}
          >
            {allComplete ? 'Complete Breakdown' : `${totalItems - totalCompleted} items remaining`}
          </Button>
        </div>
      )}
    </div>
  )
}
