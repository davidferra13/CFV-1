'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Plus, GripVertical, X, Pencil, LayoutDashboard } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import {
  getMyDashboardConfig,
  saveMyDashboardWidgets,
  saveMyDashboardNotes,
  loadWidgetData,
  type MyDashboardConfig,
} from '@/lib/dashboard/my-dashboard-actions'
import {
  DASHBOARD_WIDGET_LABELS,
  DASHBOARD_WIDGET_META,
  getWidgetIcon,
  widgetGridClass,
  type DashboardWidgetId,
} from '@/lib/scheduling/types'
import { WidgetPickerModal } from './widget-picker-modal'
import { WidgetRenderer } from './widget-renderer'
import { TemplateCards } from './template-cards'
import { toast } from 'sonner'

interface Props {
  chefId: string
}

export function MyDashboardTab({ chefId }: Props) {
  const [config, setConfig] = useState<MyDashboardConfig | null>(null)
  const [widgetData, setWidgetData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editWidgets, setEditWidgets] = useState<string[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragItemRef = useRef<number | null>(null)
  const dragOverRef = useRef<number | null>(null)

  // Load config + widget data
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const cfg = await getMyDashboardConfig()
        if (cancelled) return
        setConfig(cfg)
        setNotes(cfg.notes)
        setEditWidgets(cfg.widgetIds)

        if (cfg.widgetIds.length > 0) {
          const data = await loadWidgetData(cfg.widgetIds)
          if (!cancelled) setWidgetData(data)
        }
      } catch (err) {
        console.error('[MyDashboard] Load failed:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-save notes with debounce
  const handleNotesChange = useCallback((value: string) => {
    setNotes(value)
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current)
    notesTimeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          await saveMyDashboardNotes(value)
        } catch {
          toast.error('Failed to save notes')
        }
      })
    }, 1000)
  }, [])

  // Enter edit mode
  const enterEdit = () => {
    setEditWidgets(config?.widgetIds ?? [])
    setEditMode(true)
  }

  // Save edited widget order
  const saveEdit = () => {
    startTransition(async () => {
      try {
        await saveMyDashboardWidgets(editWidgets)
        setConfig((prev) => (prev ? { ...prev, widgetIds: editWidgets } : prev))
        setEditMode(false)
        // Reload widget data for any newly added widgets
        if (editWidgets.length > 0) {
          const data = await loadWidgetData(editWidgets)
          setWidgetData(data)
        }
        toast.success('Dashboard saved')
      } catch {
        toast.error('Failed to save dashboard')
      }
    })
  }

  // Cancel edit
  const cancelEdit = () => {
    setEditWidgets(config?.widgetIds ?? [])
    setEditMode(false)
  }

  // Remove widget from edit list
  const removeWidget = (index: number) => {
    setEditWidgets((prev) => prev.filter((_, i) => i !== index))
  }

  // Move widget up/down
  const moveWidget = (index: number, direction: 'up' | 'down') => {
    setEditWidgets((prev) => {
      const next = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  // Drag handlers
  const handleDragStart = (index: number) => {
    dragItemRef.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragOverRef.current = index
  }

  const handleDrop = () => {
    if (dragItemRef.current === null || dragOverRef.current === null) return
    if (dragItemRef.current === dragOverRef.current) return

    setEditWidgets((prev) => {
      const next = [...prev]
      const draggedItem = next[dragItemRef.current!]
      next.splice(dragItemRef.current!, 1)
      next.splice(dragOverRef.current!, 0, draggedItem)
      return next
    })
    dragItemRef.current = null
    dragOverRef.current = null
  }

  // Add widgets from picker
  const handleAddWidgets = (newIds: string[]) => {
    setEditWidgets((prev) => {
      const existing = new Set(prev)
      const toAdd = newIds.filter((id) => !existing.has(id))
      return [...prev, ...toAdd]
    })
    setShowPicker(false)
  }

  // Apply a template (replaces current widgets, saves immediately)
  const applyTemplate = (widgetIds: string[]) => {
    startTransition(async () => {
      try {
        await saveMyDashboardWidgets(widgetIds)
        setConfig((prev) => (prev ? { ...prev, widgetIds } : prev))
        setEditWidgets(widgetIds)
        if (widgetIds.length > 0) {
          const data = await loadWidgetData(widgetIds)
          setWidgetData(data)
        }
        toast.success('Template applied')
      } catch {
        toast.error('Failed to apply template')
      }
    })
  }

  if (loading) {
    return (
      <>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="col-span-1 sm:col-span-1 animate-pulse rounded-2xl bg-stone-800/50 border border-stone-700/50 h-32"
          />
        ))}
      </>
    )
  }

  const activeWidgets = editMode ? editWidgets : (config?.widgetIds ?? [])
  const isEmpty = activeWidgets.length === 0 && !editMode

  return (
    <>
      {/* Toolbar */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-300">
          {editMode ? 'Editing Dashboard' : 'My Dashboard'}
        </h2>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPicker(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Widgets
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates((p) => !p)}
                className="gap-1.5"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Templates
              </Button>
              <Button variant="secondary" size="sm" onClick={enterEdit} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Customize
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Empty state with templates */}
      {isEmpty && (
        <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-6">
          <div className="text-center py-6">
            <LayoutDashboard className="h-10 w-10 text-stone-600 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-stone-200 mb-1">Your personal dashboard</h3>
            <p className="text-sm text-stone-500 max-w-md mx-auto">
              Pick a template to get started, or build from scratch.
            </p>
          </div>

          <TemplateCards
            chefArchetype={config?.chefArchetype ?? null}
            onApply={applyTemplate}
            isPending={isPending}
          />

          <div className="text-center pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                enterEdit()
                setShowPicker(true)
              }}
              className="gap-1.5 text-stone-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Or start from scratch
            </Button>
          </div>
        </div>
      )}

      {/* Template picker (accessible from populated dashboards via toolbar) */}
      {showTemplates && !isEmpty && (
        <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Switch to a template
            </p>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-xs text-stone-500 hover:text-stone-300"
            >
              Close
            </button>
          </div>
          <TemplateCards
            chefArchetype={config?.chefArchetype ?? null}
            onApply={(widgetIds) => {
              applyTemplate(widgetIds)
              setShowTemplates(false)
            }}
            isPending={isPending}
          />
        </div>
      )}

      {/* Notes widget (always visible when there are widgets or notes exist) */}
      {(activeWidgets.length > 0 || notes) && (
        <div className="col-span-1 sm:col-span-2 lg:col-span-4">
          <div className="rounded-2xl border border-stone-700/50 bg-stone-900/80 p-4">
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 block">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Jot down anything: reminders, goals, ideas..."
              rows={2}
              className="w-full bg-transparent text-sm text-stone-200 placeholder:text-stone-600 resize-none focus:outline-none"
            />
            {isPending && <p className="text-xs text-stone-600 mt-1">Saving...</p>}
          </div>
        </div>
      )}

      {/* Widgets */}
      {activeWidgets.map((widgetId, index) => {
        const meta = DASHBOARD_WIDGET_META[widgetId as DashboardWidgetId]
        const gridClass = meta?.size === 'lg' ? 'col-span-1 sm:col-span-2' : 'col-span-1'

        return (
          <div
            key={`${widgetId}-${index}`}
            className={`${gridClass} relative group`}
            draggable={editMode}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
          >
            {/* Edit mode overlay controls */}
            {editMode && (
              <div className="absolute inset-0 z-10 rounded-2xl border-2 border-dashed border-brand-600/40 bg-stone-900/40 flex items-start justify-between p-2">
                <div className="flex items-center gap-1.5">
                  <GripVertical className="h-4 w-4 text-stone-500 cursor-grab" />
                  <span className="text-xs font-medium text-stone-300">
                    {getWidgetIcon(widgetId)}{' '}
                    {DASHBOARD_WIDGET_LABELS[widgetId as DashboardWidgetId] || widgetId}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveWidget(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-stone-700 text-stone-400 disabled:opacity-30"
                    title="Move up"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveWidget(index, 'down')}
                    disabled={index === activeWidgets.length - 1}
                    className="p-1 rounded hover:bg-stone-700 text-stone-400 disabled:opacity-30"
                    title="Move down"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeWidget(index)}
                    className="p-1 rounded hover:bg-red-900/50 text-red-400"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Actual widget content */}
            <WidgetRenderer widgetId={widgetId} data={widgetData[widgetId]} />
          </div>
        )
      })}

      {/* Widget Picker Modal */}
      {showPicker && (
        <WidgetPickerModal
          currentWidgets={editWidgets}
          onAdd={handleAddWidgets}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
