'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getPrepTimeline,
  addPrepTimelineItem,
  togglePrepItem,
  removePrepItem,
  generatePrepTimeline,
  type PrepTimeline,
  type PrepTimelineItem,
} from '@/lib/events/prep-timeline-actions'

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string }> = {
  transport: { emoji: '🚗', color: 'text-blue-300' },
  setup: { emoji: '🏗️', color: 'text-purple-300' },
  prep: { emoji: '🔪', color: 'text-orange-300' },
  cook: { emoji: '🔥', color: 'text-red-300' },
  plate: { emoji: '🍽️', color: 'text-emerald-300' },
  other: { emoji: '📋', color: 'text-stone-300' },
}

function formatTimeBefore(minutes: number): string {
  if (minutes === 0) return 'Serve time'
  if (minutes < 60) return `${minutes}m before`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h before`
  return `${hours}h ${mins}m before`
}

function formatActualTime(serveTime: string | null, minutesBefore: number): string | null {
  if (!serveTime) return null
  const [h, m] = serveTime.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  const totalMinutes = h * 60 + m - minutesBefore
  if (totalMinutes < 0) return null
  const hour = Math.floor(totalMinutes / 60)
  const min = totalMinutes % 60
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`
}

type Props = {
  eventId: string
}

export function PrepTimelinePanel({ eventId }: Props) {
  const [timeline, setTimeline] = useState<PrepTimeline | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newMinutes, setNewMinutes] = useState('60')
  const [newCategory, setNewCategory] = useState<PrepTimelineItem['category']>('prep')

  useEffect(() => {
    getPrepTimeline(eventId)
      .then(setTimeline)
      .catch(() => {})
  }, [eventId])

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await generatePrepTimeline(eventId)
        if (!result.success) {
          setError(result.error || 'Failed to generate timeline')
          return
        }
        const updated = await getPrepTimeline(eventId)
        setTimeline(updated)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  function handleAdd() {
    if (!newLabel.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await addPrepTimelineItem({
          eventId,
          label: newLabel.trim(),
          minutesBefore: parseInt(newMinutes) || 60,
          category: newCategory,
        })
        const updated = await getPrepTimeline(eventId)
        setTimeline(updated)
        setNewLabel('')
        setShowAdd(false)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  function handleToggle(item: PrepTimelineItem) {
    startTransition(async () => {
      await togglePrepItem({ itemId: item.id, eventId, completed: !item.completed })
      setTimeline((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) =>
                i.id === item.id ? { ...i, completed: !i.completed } : i
              ),
            }
          : prev
      )
    })
  }

  function handleRemove(itemId: string) {
    startTransition(async () => {
      await removePrepItem({ itemId, eventId })
      setTimeline((prev) =>
        prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev
      )
    })
  }

  if (!timeline) return null

  const completedCount = timeline.items.filter((i) => i.completed).length
  const totalCount = timeline.items.length

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-white">Prep Timeline</h3>
        <div className="flex items-center gap-2">
          {totalCount === 0 && (
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={isPending}
              className="text-xs"
            >
              Generate from Menu
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => setShowAdd(true)}
            disabled={isPending}
            className="text-xs"
          >
            + Add
          </Button>
        </div>
      </div>
      <p className="text-xs text-stone-400 mb-4">
        {totalCount === 0
          ? 'Reverse-scheduled checklist from serve time.'
          : `${completedCount}/${totalCount} complete${timeline.serveTime ? ` (serving at ${timeline.serveTime})` : ''}`}
      </p>

      {error && (
        <div className="mb-3 rounded-lg bg-red-900/50 border border-red-700 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 rounded-lg border border-stone-600 bg-stone-800/50 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-stone-400 mb-1">Task</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Start reducing sauce"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Minutes before</label>
              <input
                type="number"
                value={newMinutes}
                onChange={(e) => setNewMinutes(e.target.value)}
                min="0"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as PrepTimelineItem['category'])}
              title="Task category"
              className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white"
            >
              <option value="prep">🔪 Prep</option>
              <option value="cook">🔥 Cook</option>
              <option value="setup">🏗️ Setup</option>
              <option value="transport">🚗 Transport</option>
              <option value="plate">🍽️ Plate</option>
              <option value="other">📋 Other</option>
            </select>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdd} disabled={isPending || !newLabel.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Timeline items */}
      {timeline.items.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-stone-700" />

          <div className="space-y-1">
            {timeline.items.map((item) => {
              const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other
              const actualTime = formatActualTime(timeline.serveTime, item.minutes_before)

              return (
                <div
                  key={item.id}
                  className={`relative flex items-start gap-3 rounded-lg p-2 pl-8 transition-opacity ${
                    item.completed ? 'opacity-50' : ''
                  }`}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-2.5 top-3.5 h-3 w-3 rounded-full border-2 ${
                      item.completed
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'bg-stone-900 border-stone-500'
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cat.emoji}</span>
                      <span
                        className={`text-sm font-medium ${item.completed ? 'line-through text-stone-500' : 'text-white'}`}
                      >
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-stone-400">
                        {formatTimeBefore(item.minutes_before)}
                      </span>
                      {actualTime && <span className="text-xs text-stone-500">({actualTime})</span>}
                      {item.duration_minutes && (
                        <span className="text-xs text-stone-500">~{item.duration_minutes}min</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggle(item)}
                      disabled={isPending}
                      className={`text-xs px-2 py-0.5 rounded ${
                        item.completed
                          ? 'bg-emerald-900/40 text-emerald-300'
                          : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                      }`}
                    >
                      {item.completed ? '✓' : 'Done'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      disabled={isPending}
                      className="text-xs text-red-400/60 hover:text-red-300 px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {totalCount > 0 && completedCount === totalCount && (
        <div className="mt-4 text-center text-sm text-emerald-400 font-medium">
          All prep complete. Time to cook.
        </div>
      )}
    </Card>
  )
}
