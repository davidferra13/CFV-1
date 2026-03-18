'use client'

// Pre-Service Checklist Component (Phase 4)
// Auto-generated checklist from event data. Completion state stored in localStorage.
// Safety items (allergies, dietary) always appear first.

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ChecklistItem } from '@/lib/events/generate-pre-service-checklist'

type Props = {
  eventId: string
  eventTitle: string
  items: ChecklistItem[]
  compact?: boolean // for briefing view
}

const CATEGORY_LABELS: Record<string, string> = {
  safety: 'Safety & Dietary',
  prep: 'Prep',
  equipment: 'Equipment',
  venue: 'Venue & Logistics',
  staff: 'Staff',
  service: 'Service',
  custom: 'Custom',
}

const CATEGORY_ORDER = ['safety', 'prep', 'equipment', 'venue', 'staff', 'service', 'custom']

const PRIORITY_STYLES: Record<string, { badge: 'error' | 'warning' | 'default'; bg: string }> = {
  critical: { badge: 'error', bg: 'bg-red-950/20 border-red-900/30' },
  high: { badge: 'warning', bg: 'bg-amber-950/10 border-amber-900/20' },
  normal: { badge: 'default', bg: 'bg-stone-800/40 border-stone-700/50' },
}

function getStorageKey(eventId: string): string {
  return `checklist-${eventId}`
}

export function PreServiceChecklist({ eventId, eventTitle, items, compact }: Props) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  // Load completion state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(eventId))
      if (stored) {
        setCompletedIds(new Set(JSON.parse(stored)))
      }
    } catch {}
  }, [eventId])

  function toggleItem(itemId: string) {
    setCompletedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      // Persist
      try {
        localStorage.setItem(getStorageKey(eventId), JSON.stringify([...next]))
      } catch {}
      return next
    })
  }

  // Group items by category
  const grouped = new Map<string, ChecklistItem[]>()
  for (const item of items) {
    const existing = grouped.get(item.category) ?? []
    existing.push(item)
    grouped.set(item.category, existing)
  }

  const totalItems = items.length
  const doneItems = items.filter((i) => completedIds.has(i.id)).length
  const allDone = doneItems === totalItems && totalItems > 0

  if (compact) {
    // Compact view for briefing: just show progress + critical items
    const criticalItems = items.filter((i) => i.priority === 'critical' && !completedIds.has(i.id))

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">
            {doneItems}/{totalItems} items
          </span>
          <div className="flex-1 h-1 rounded-full bg-stone-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${allDone ? 'bg-emerald-500' : 'bg-brand-500'}`}
              style={{ width: totalItems > 0 ? `${(doneItems / totalItems) * 100}%` : '0%' }}
            />
          </div>
        </div>
        {criticalItems.length > 0 && (
          <div className="space-y-1">
            {criticalItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <Badge variant="error" className="text-2xs">
                  !
                </Badge>
                <span className="text-red-300">{item.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pre-Service Checklist</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">
              {doneItems}/{totalItems}
            </span>
            {allDone && (
              <Badge variant="success" className="text-xxs">
                Complete
              </Badge>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 rounded-full bg-stone-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${allDone ? 'bg-emerald-500' : 'bg-brand-500'}`}
            style={{ width: totalItems > 0 ? `${(doneItems / totalItems) * 100}%` : '0%' }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {CATEGORY_ORDER.map((cat) => {
          const catItems = grouped.get(cat)
          if (!catItems || catItems.length === 0) return null

          return (
            <div key={cat}>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[cat] ?? cat}
              </p>
              <div className="space-y-1.5">
                {catItems.map((item) => {
                  const done = completedIds.has(item.id)
                  const style = PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.normal

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className={`w-full text-left rounded-lg border px-3 py-2 transition-all ${
                        done ? 'opacity-50 bg-stone-900 border-stone-800' : style.bg
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Checkbox */}
                        <div
                          className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-colors ${
                            done
                              ? 'bg-emerald-600 border-emerald-500'
                              : 'bg-stone-800 border-stone-600'
                          }`}
                        >
                          {done && (
                            <svg viewBox="0 0 16 16" className="w-full h-full text-white p-0.5">
                              <path
                                d="M4 8l3 3 5-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-sm ${
                              done ? 'line-through text-stone-500' : 'text-stone-200'
                            }`}
                          >
                            {item.title}
                          </span>
                          {item.detail && (
                            <p
                              className={`text-xs mt-0.5 ${done ? 'text-stone-600' : 'text-stone-400'}`}
                            >
                              {item.detail}
                            </p>
                          )}
                        </div>

                        {item.priority === 'critical' && !done && (
                          <Badge variant="error" className="text-2xs flex-shrink-0">
                            Critical
                          </Badge>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
