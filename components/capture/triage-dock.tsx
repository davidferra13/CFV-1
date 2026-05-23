'use client'

// Passive Capture Triage Dock
// Chef reviews inbound captures and routes them to entities.
// No manual data entry; system captures, chef triages.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  routeCaptureToTarget,
  batchDismissCaptures,
} from '@/lib/capture/triage-dock-actions'
import type {
  TriageDockFeed,
  TriageDockItem,
  TriageTarget,
} from '@/lib/capture/triage-dock-actions'

interface TriageDockProps {
  feed: TriageDockFeed
}

function confidenceColor(confidence: 'high' | 'medium' | 'low'): string {
  if (confidence === 'high') return 'bg-green-500/20 text-green-400'
  if (confidence === 'medium') return 'bg-amber-500/20 text-amber-400'
  return 'bg-stone-500/20 text-stone-400'
}

function categoryLabel(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function TriageDockItemCard({
  item,
  onRoute,
  onDismiss,
  isPending,
}: {
  item: TriageDockItem
  onRoute: (captureId: string, target: TriageTarget) => void
  onDismiss: (captureId: string) => void
  isPending: boolean
}) {
  const { capture, suggestedTargets } = item

  return (
    <div className="border border-stone-700 rounded-lg p-3 bg-stone-900/50 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-200 line-clamp-2">{capture.content}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-stone-500">{timeAgo(capture.captured_at)}</span>
            <Badge variant="info" className="text-[10px] px-1.5 py-0">
              {categoryLabel(capture.category)}
            </Badge>
            {capture.priority === 'high' || capture.priority === 'urgent' ? (
              <Badge variant="error" className="text-[10px] px-1.5 py-0">
                {capture.priority}
              </Badge>
            ) : null}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-stone-500 hover:text-stone-300 shrink-0"
          onClick={() => onDismiss(capture.id)}
          disabled={isPending}
        >
          Dismiss
        </Button>
      </div>

      {/* Suggested targets */}
      {suggestedTargets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestedTargets.map((suggestion, i) => (
            <button
              key={i}
              className={`text-xs px-2 py-1 rounded-md border border-stone-700 hover:border-stone-500 transition-colors ${confidenceColor(suggestion.confidence)}`}
              onClick={() => {
                const target: TriageTarget =
                  suggestion.type === 'dismiss'
                    ? { type: 'dismiss' }
                    : suggestion.type === 'task'
                      ? { type: 'task', description: capture.content }
                      : suggestion.type === 'event'
                        ? { type: 'event', eventId: suggestion.entityId ?? '' }
                        : suggestion.type === 'client'
                          ? { type: 'client', clientId: suggestion.entityId ?? '' }
                          : suggestion.type === 'recipe'
                            ? { type: 'recipe', recipeId: suggestion.entityId ?? '' }
                            : suggestion.type === 'menu'
                              ? { type: 'menu', menuId: suggestion.entityId ?? '' }
                              : { type: 'inquiry', inquiryId: suggestion.entityId ?? '' }
                onRoute(capture.id, target)
              }}
              disabled={isPending}
              title={suggestion.reason}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function TriageDock({ feed }: TriageDockProps) {
  const [items, setItems] = useState(feed.items)
  const [isPending, startTransition] = useTransition()

  function handleRoute(captureId: string, target: TriageTarget) {
    startTransition(async () => {
      try {
        const result = await routeCaptureToTarget(captureId, target)
        if (result.success) {
          setItems((prev) => prev.filter((i) => i.capture.id !== captureId))
          toast.success(target.type === 'dismiss' ? 'Dismissed' : `Routed to ${target.type}`)
        } else {
          toast.error(result.error ?? 'Failed to route')
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to route capture')
      }
    })
  }

  function handleDismiss(captureId: string) {
    handleRoute(captureId, { type: 'dismiss' })
  }

  function handleDismissAll() {
    const ids = items.map((i) => i.capture.id)
    startTransition(async () => {
      try {
        const result = await batchDismissCaptures(ids)
        if (result.success) {
          setItems([])
          toast.success(`Dismissed ${result.dismissed} items`)
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to dismiss')
      }
    })
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500 text-sm">
        No items in the triage dock. Captures will appear here as they arrive.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Dock header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-stone-300">Triage Dock</h3>
          <Badge variant="default" className="text-xs">
            {items.length}
          </Badge>
        </div>
        {items.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-stone-500"
            onClick={handleDismissAll}
            disabled={isPending}
          >
            Dismiss all
          </Button>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <TriageDockItemCard
            key={item.capture.id}
            item={item}
            onRoute={handleRoute}
            onDismiss={handleDismiss}
            isPending={isPending}
          />
        ))}
      </div>
    </div>
  )
}
