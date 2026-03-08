'use client'

// Post-Service Cleanup Checklist
// Standardized cleanup protocol for after cooking at a client's home.
// Checklist state stored in localStorage (ephemeral, day-of use only).
// Chef can customize, save defaults, and reset to standard items.

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ── Types ──

type ChecklistItem = {
  id: string
  label: string
  section: string
}

type ChecklistSection = {
  key: string
  title: string
  items: ChecklistItem[]
}

// ── Default Checklist ──

const DEFAULT_SECTIONS: ChecklistSection[] = [
  {
    key: 'kitchen',
    title: 'Kitchen Cleanup',
    items: [
      { id: 'kitchen-surfaces', label: 'All surfaces wiped down', section: 'kitchen' },
      { id: 'kitchen-stovetop', label: 'Stovetop cleaned', section: 'kitchen' },
      { id: 'kitchen-oven', label: 'Oven checked and turned off', section: 'kitchen' },
      { id: 'kitchen-sink', label: 'Sink cleared and cleaned', section: 'kitchen' },
      { id: 'kitchen-floors', label: 'Floors swept/mopped if needed', section: 'kitchen' },
      { id: 'kitchen-trash', label: 'Trash taken out (or bagged and placed where client wants)', section: 'kitchen' },
      { id: 'kitchen-dishwasher', label: 'Dishwasher loaded/run (if applicable)', section: 'kitchen' },
    ],
  },
  {
    key: 'equipment',
    title: 'Equipment Pack-Out',
    items: [
      { id: 'equip-knives', label: 'Knife roll packed (all knives accounted for)', section: 'equipment' },
      { id: 'equip-cookware', label: 'All cookware packed', section: 'equipment' },
      { id: 'equip-serving', label: 'All serving pieces packed', section: 'equipment' },
      { id: 'equip-tools', label: 'All small tools and utensils packed', section: 'equipment' },
      { id: 'equip-coolers', label: 'Coolers and transport containers packed', section: 'equipment' },
      { id: 'equip-fridge', label: 'Nothing left in fridge/freezer (or intentionally left items noted)', section: 'equipment' },
    ],
  },
  {
    key: 'final',
    title: 'Final Checks',
    items: [
      { id: 'final-appliances', label: 'All appliances turned off', section: 'final' },
      { id: 'final-kitchen-state', label: "Client's kitchen returned to original state", section: 'final' },
      { id: 'final-leftovers', label: 'Leftover food packaged and labeled for client', section: 'final' },
      { id: 'final-inventory', label: 'Inventory matches what you brought (nothing missing)', section: 'final' },
    ],
  },
  {
    key: 'signoff',
    title: 'Client Sign-Off',
    items: [
      { id: 'signoff-photo', label: 'Photo of clean kitchen taken', section: 'signoff' },
      { id: 'signoff-notify', label: 'Client notified service is complete', section: 'signoff' },
    ],
  },
]

// ── Storage Helpers ──

function getCheckKey(eventId: string): string {
  return `cleanup-checklist-${eventId}`
}

function getDefaultsKey(): string {
  return 'cleanup-checklist-defaults'
}

function loadChecked(eventId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getCheckKey(eventId))
    if (raw) return new Set(JSON.parse(raw))
  } catch {}
  return new Set()
}

function saveChecked(eventId: string, checked: Set<string>) {
  try {
    localStorage.setItem(getCheckKey(eventId), JSON.stringify([...checked]))
  } catch {}
}

function loadCustomSections(): ChecklistSection[] | null {
  try {
    const raw = localStorage.getItem(getDefaultsKey())
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveCustomSections(sections: ChecklistSection[]) {
  try {
    localStorage.setItem(getDefaultsKey(), JSON.stringify(sections))
  } catch {}
}

function clearCustomSections() {
  try {
    localStorage.removeItem(getDefaultsKey())
  } catch {}
}

// ── Component ──

type Props = {
  eventId: string
  onClose?: () => void
}

export function PostServiceChecklist({ eventId, onClose }: Props) {
  const [sections, setSections] = useState<ChecklistSection[]>(DEFAULT_SECTIONS)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const [newItemSection, setNewItemSection] = useState('')
  const [showComplete, setShowComplete] = useState(false)
  const [hasCustomDefaults, setHasCustomDefaults] = useState(false)

  // Load state on mount
  useEffect(() => {
    const custom = loadCustomSections()
    if (custom) {
      setSections(custom)
      setHasCustomDefaults(true)
    }
    setChecked(loadChecked(eventId))
  }, [eventId])

  const toggleItem = useCallback(
    (itemId: string) => {
      setChecked((prev) => {
        const next = new Set(prev)
        if (next.has(itemId)) {
          next.delete(itemId)
        } else {
          next.add(itemId)
        }
        saveChecked(eventId, next)
        return next
      })
    },
    [eventId]
  )

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)
  const doneItems = sections.reduce(
    (sum, s) => sum + s.items.filter((i) => checked.has(i.id)).length,
    0
  )
  const allDone = doneItems === totalItems && totalItems > 0
  const progressPct = totalItems > 0 ? (doneItems / totalItems) * 100 : 0

  // Show completion overlay when all done
  useEffect(() => {
    if (allDone && doneItems > 0) {
      setShowComplete(true)
    }
  }, [allDone, doneItems])

  // ── Customization ──

  function addCustomItem() {
    if (!newItemText.trim() || !newItemSection) return
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newItem: ChecklistItem = {
      id,
      label: newItemText.trim(),
      section: newItemSection,
    }
    setSections((prev) =>
      prev.map((s) =>
        s.key === newItemSection ? { ...s, items: [...s.items, newItem] } : s
      )
    )
    setNewItemText('')
  }

  function removeItem(sectionKey: string, itemId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.key === sectionKey
          ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
          : s
      )
    )
    // Also uncheck if checked
    setChecked((prev) => {
      const next = new Set(prev)
      next.delete(itemId)
      saveChecked(eventId, next)
      return next
    })
  }

  function saveAsDefault() {
    saveCustomSections(sections)
    setHasCustomDefaults(true)
    setEditing(false)
  }

  function resetToDefault() {
    clearCustomSections()
    setSections(DEFAULT_SECTIONS)
    setHasCustomDefaults(false)
    setEditing(false)
  }

  // ── Render ──

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg">Cleanup Checklist</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">
              {doneItems}/{totalItems}
            </span>
            {allDone && (
              <Badge variant="success" className="text-[10px]">
                Complete
              </Badge>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="ml-2 p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
                aria-label="Close checklist"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-2 rounded-full bg-stone-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              allDone ? 'bg-emerald-500' : 'bg-brand-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Edit/save controls */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Done editing' : 'Customize'}
          </Button>
          {editing && (
            <>
              <Button variant="secondary" size="sm" onClick={saveAsDefault}>
                Save as my default
              </Button>
              {hasCustomDefaults && (
                <Button variant="ghost" size="sm" onClick={resetToDefault}>
                  Reset to standard
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-2">
        {sections.map((section) => {
          const sectionDone = section.items.filter((i) => checked.has(i.id)).length
          const sectionTotal = section.items.length
          if (sectionTotal === 0) return null

          return (
            <div key={section.key}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                  {section.title}
                </p>
                <span className="text-[10px] text-stone-500">
                  {sectionDone}/{sectionTotal}
                </span>
              </div>
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const done = checked.has(item.id)

                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className={`flex-1 text-left rounded-lg border px-3 py-3 sm:py-2 transition-all ${
                          done
                            ? 'opacity-50 bg-stone-900 border-stone-800'
                            : 'bg-stone-800/40 border-stone-700/50 active:bg-stone-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Large mobile-friendly checkbox */}
                          <div
                            className={`flex-shrink-0 w-6 h-6 sm:w-5 sm:h-5 rounded border-2 transition-colors flex items-center justify-center ${
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
                          <span
                            className={`text-sm sm:text-sm ${
                              done ? 'line-through text-stone-500' : 'text-stone-200'
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                      </button>
                      {editing && (
                        <button
                          type="button"
                          onClick={() => removeItem(section.key, item.id)}
                          className="flex-shrink-0 p-2 rounded text-red-400 hover:text-red-300 hover:bg-red-950/50 transition-colors"
                          aria-label={`Remove ${item.label}`}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Add custom item (editing mode) */}
        {editing && (
          <div className="rounded-lg border border-dashed border-stone-600 p-3 space-y-2">
            <p className="text-xs font-medium text-stone-400">Add custom item</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={newItemSection}
                onChange={(e) => setNewItemSection(e.target.value)}
                className="rounded-md bg-stone-800 border border-stone-700 px-2 py-2 text-sm text-stone-200 min-w-[140px]"
              >
                <option value="">Select section</option>
                {sections.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.title}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addCustomItem()
                }}
                placeholder="Item description"
                className="flex-1 rounded-md bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500"
              />
              <Button
                size="sm"
                onClick={addCustomItem}
                disabled={!newItemText.trim() || !newItemSection}
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Service Complete overlay */}
      {showComplete && (
        <div className="absolute inset-0 bg-stone-900/95 rounded-lg flex flex-col items-center justify-center p-6 z-10">
          <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-white">
              <path
                d="M5 13l4 4L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-emerald-400 mb-1">Service Complete</h3>
          <p className="text-sm text-stone-400 text-center mb-4">
            All cleanup items checked. Kitchen is ready.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowComplete(false)}>
              Review checklist
            </Button>
            {onClose && (
              <Button variant="primary" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
