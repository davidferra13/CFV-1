'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import {
  Inbox,
  ChevronUp,
  ChevronDown,
  Calendar,
  Users,
  UtensilsCrossed,
  XCircle,
  CheckSquare,
  Tag,
  Loader2,
  X,
} from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  getCaptures,
  updateCapture,
  archiveCapture,
  type Capture,
  type CaptureTag,
} from '@/lib/capture/actions'

type TriageTarget = 'event' | 'client' | 'recipe' | 'dismiss'

const TRIAGE_TARGETS: {
  key: TriageTarget
  label: string
  icon: typeof Calendar
  tag?: CaptureTag
}[] = [
  { key: 'event', label: 'Event', icon: Calendar, tag: 'event-idea' },
  { key: 'client', label: 'Client', icon: Users, tag: 'client-note' },
  { key: 'recipe', label: 'Recipe', icon: UtensilsCrossed, tag: 'recipe' },
  { key: 'dismiss', label: 'Dismiss', icon: XCircle },
]

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '...'
}

function timeAgo(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString()
}

export function TriageDock() {
  const [expanded, setExpanded] = useState(false)
  const [items, setItems] = useState<Capture[]>([])
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  const inboxCount = items.filter((c) => c.status === 'inbox').length

  const loadInbox = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getCaptures({ status: 'inbox', limit: 50 })
        setItems(data)
        setLoaded(true)
      } catch {
        // Silently fail on load; dock stays hidden
        setLoaded(true)
      }
    })
  }, [])

  useEffect(() => {
    loadInbox()
  }, [loadInbox])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    const inboxIds = items.filter((c) => c.status === 'inbox').map((c) => c.id)
    setSelected(new Set(inboxIds))
  }

  function clearSelection() {
    setSelected(new Set())
  }

  function handleTriage(target: TriageTarget, captureIds: string[]) {
    if (!captureIds.length) return

    const prev = items
    // Optimistic: remove from list
    setItems((cs) => cs.filter((c) => !captureIds.includes(c.id)))
    setSelected(new Set())

    startTransition(async () => {
      try {
        for (const id of captureIds) {
          if (target === 'dismiss') {
            await archiveCapture(id)
          } else {
            const targetDef = TRIAGE_TARGETS.find((t) => t.key === target)
            await updateCapture(id, {
              status: 'sorted',
              tags: targetDef?.tag ? [targetDef.tag] : undefined,
            })
          }
        }
        const label = target === 'dismiss' ? 'dismissed' : `assigned to ${target}`
        toast.success(
          captureIds.length === 1 ? `Capture ${label}` : `${captureIds.length} captures ${label}`
        )
      } catch {
        setItems(prev)
        toast.error('Failed to triage captures')
      }
    })
  }

  function handleSingleTriage(target: TriageTarget, id: string) {
    handleTriage(target, [id])
  }

  function handleBulkTriage(target: TriageTarget) {
    handleTriage(target, Array.from(selected))
  }

  // Don't render until loaded; don't render if no inbox items
  if (!loaded || inboxCount === 0) return null

  // Collapsed state: just the badge
  if (!expanded) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-fab">
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 bg-stone-900 border border-stone-700 text-stone-200 px-4 py-2.5 rounded-full shadow-lg hover:bg-stone-800 transition-all active:scale-95"
        >
          <Inbox className="w-4 h-4" />
          <span className="text-sm font-medium">Triage</span>
          <Badge variant="warning" className="text-xs px-2 py-0.5">
            {inboxCount}
          </Badge>
          <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
        </button>
      </div>
    )
  }

  const inboxItems = items.filter((c) => c.status === 'inbox')

  return (
    <div className="fixed bottom-0 left-0 right-0 z-fab">
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/20 sm:hidden"
        onClick={() => setExpanded(false)}
        aria-hidden
      />

      <div className="relative bg-stone-900 border-t border-stone-700 shadow-2xl rounded-t-2xl max-h-[60vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-stone-400" />
            <span className="text-sm font-semibold text-stone-200">Capture Triage</span>
            <Badge variant="warning" className="text-xs px-2 py-0.5">
              {inboxCount}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk mode toggle */}
            <button
              onClick={() => {
                setBulkMode(!bulkMode)
                clearSelection()
              }}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                bulkMode
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Bulk
            </button>
            {/* Collapse */}
            <button
              onClick={() => setExpanded(false)}
              className="text-stone-400 hover:text-stone-200 p-1 rounded-lg hover:bg-stone-800 transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk action bar */}
        {bulkMode && selected.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-800 bg-stone-800/50 shrink-0">
            <span className="text-xs text-stone-400">{selected.size} selected</span>
            <div className="flex items-center gap-1 ml-auto">
              {TRIAGE_TARGETS.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.key}
                    onClick={() => handleBulkTriage(t.key)}
                    disabled={isPending}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                      t.key === 'dismiss'
                        ? 'text-red-400 hover:bg-red-900/30'
                        : 'text-stone-300 hover:bg-stone-700'
                    } disabled:opacity-50`}
                    title={t.label}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Bulk select all / clear */}
        {bulkMode && (
          <div className="flex items-center gap-2 px-4 py-1.5 border-b border-stone-800 shrink-0">
            <button
              onClick={selectAll}
              className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
            >
              Select all
            </button>
            <span className="text-stone-700">|</span>
            <button
              onClick={clearSelection}
              className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* Items list */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {isPending && inboxItems.length === 0 && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-stone-500" />
            </div>
          )}
          {inboxItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 px-4 py-3 border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors"
            >
              {/* Checkbox in bulk mode */}
              {bulkMode && (
                <button
                  onClick={() => toggleSelect(item.id)}
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    selected.has(item.id)
                      ? 'bg-stone-600 border-stone-500 text-white'
                      : 'border-stone-600 hover:border-stone-400'
                  }`}
                >
                  {selected.has(item.id) && (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-200 leading-snug">
                  {truncate(item.rawContent, 120)}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.tags.length > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-stone-500">
                      <Tag className="w-3 h-3" />
                      {item.tags.slice(0, 2).join(', ')}
                    </span>
                  )}
                  <span className="text-xs text-stone-600">{timeAgo(item.createdAt)}</span>
                </div>
              </div>

              {/* Quick triage buttons (single mode only) */}
              {!bulkMode && (
                <div className="flex items-center gap-0.5 shrink-0">
                  {TRIAGE_TARGETS.map((t) => {
                    const Icon = t.icon
                    return (
                      <button
                        key={t.key}
                        onClick={() => handleSingleTriage(t.key, item.id)}
                        disabled={isPending}
                        className={`p-1.5 rounded-lg transition-colors ${
                          t.key === 'dismiss'
                            ? 'text-red-500/60 hover:text-red-400 hover:bg-red-900/20'
                            : 'text-stone-500 hover:text-stone-200 hover:bg-stone-700'
                        } disabled:opacity-50`}
                        title={t.label}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
