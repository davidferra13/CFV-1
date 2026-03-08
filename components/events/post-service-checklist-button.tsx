'use client'

// Post-Service Cleanup Checklist Button
// Renders a card with progress indicator that opens the full checklist in a modal overlay.
// Visible on the Ops tab when event is in_progress or completed.

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PostServiceChecklist } from './post-service-checklist'

type Props = {
  eventId: string
}

// Match the storage key from post-service-checklist.tsx
function getCheckKey(eventId: string): string {
  return `cleanup-checklist-${eventId}`
}

// Default item count (without custom items)
const DEFAULT_ITEM_COUNT = 19

function getProgress(eventId: string): { done: number; total: number } {
  try {
    const raw = localStorage.getItem(getCheckKey(eventId))
    if (raw) {
      const ids: string[] = JSON.parse(raw)
      // Total may vary if chef customized, but we use default as baseline
      // The actual total is tracked inside the checklist component
      return { done: ids.length, total: DEFAULT_ITEM_COUNT }
    }
  } catch {}
  return { done: 0, total: DEFAULT_ITEM_COUNT }
}

export function PostServiceChecklistButton({ eventId }: Props) {
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: DEFAULT_ITEM_COUNT })

  useEffect(() => {
    setProgress(getProgress(eventId))
  }, [eventId])

  // Refresh progress when modal closes
  function handleClose() {
    setOpen(false)
    setProgress(getProgress(eventId))
  }

  const allDone = progress.done >= progress.total && progress.total > 0

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-sm font-semibold text-stone-300">Cleanup Checklist</h3>
              {progress.done > 0 && (
                <span className="text-xs text-stone-500">
                  {progress.done}/{progress.total}
                </span>
              )}
              {allDone && (
                <Badge variant="success" className="text-[10px]">
                  Complete
                </Badge>
              )}
            </div>
            <p className="text-sm text-stone-400">
              {allDone
                ? 'All cleanup items verified. Kitchen is ready.'
                : progress.done > 0
                  ? `${progress.done} of ${progress.total} items checked`
                  : 'Pack equipment, clean kitchen, get client sign-off'}
            </p>
          </div>
          <Button
            variant={allDone ? 'ghost' : 'secondary'}
            size="sm"
            onClick={() => setOpen(true)}
          >
            {allDone ? 'Review' : 'Open'}
          </Button>
        </div>

        {/* Mini progress bar */}
        {progress.done > 0 && !allDone && (
          <div className="mt-2 h-1.5 rounded-full bg-stone-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{
                width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        )}
      </Card>

      {/* Full-screen modal overlay for mobile usability */}
      {open && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-stone-950/95">
          {/* Backdrop click to close */}
          <div
            className="absolute inset-0"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Content container */}
          <div className="relative z-10 flex flex-col h-full max-w-2xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
              <h2 className="text-lg font-semibold text-stone-100">Post-Service Cleanup</h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
                aria-label="Close"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            {/* Scrollable checklist */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <PostServiceChecklist eventId={eventId} onClose={handleClose} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
