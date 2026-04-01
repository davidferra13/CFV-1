// Prep Plan Panel
// Shows a day-by-day breakdown of prep blocks for an event,
// including component-specific make-ahead items mapped to calendar dates.
// Fetches its own data via server action (self-contained panel pattern).

'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { autoSuggestEventBlocks, getEventPrepBlocks } from '@/lib/scheduling/prep-block-actions'
import type { PrepBlockSuggestion, PrepBlock } from '@/lib/scheduling/types'

type PrepPlanPanelProps = {
  eventId: string
  eventDate: string
  eventStatus: string
  hasMenu: boolean
}

type DayGroup = {
  date: string
  label: string
  relativeLabel: string
  items: PrepPlanItem[]
}

type PrepPlanItem = {
  title: string
  blockType: string
  startTime: string | null
  durationMinutes: number
  station: string | null
  notes: string
  isCompleted: boolean
  componentId?: string
}

function formatDate(iso: string): string {
  try {
    const [y, m, d] = iso.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function getRelativeLabel(blockDate: string, eventDate: string): string {
  const [by, bm, bd] = blockDate.split('-').map(Number)
  const [ey, em, ed] = eventDate.split('-').map(Number)
  const blockMs = Date.UTC(by, bm - 1, bd)
  const eventMs = Date.UTC(ey, em - 1, ed)
  const diff = Math.round((blockMs - eventMs) / 86400000)

  if (diff === 0) return 'event day'
  if (diff === -1) return '1 day before'
  if (diff < -1) return `${Math.abs(diff)} days before`
  if (diff === 1) return 'day after'
  return `${diff} days after`
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${minutes}m`
}

function extractStation(notes: string): string | null {
  const match = notes.match(/Station:\s*([^.]+)/)
  return match ? match[1].trim() : null
}

export function PrepPlanPanel({ eventId, eventDate, eventStatus, hasMenu }: PrepPlanPanelProps) {
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([])
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [componentCount, setComponentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isConfirmedOrBeyond = ['confirmed', 'in_progress', 'completed'].includes(eventStatus)

  useEffect(() => {
    loadPrepPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function loadPrepPlan() {
    setLoading(true)
    setError(null)

    try {
      if (isConfirmedOrBeyond) {
        // Event already confirmed: show existing blocks
        const blocks = await getEventPrepBlocks(eventId)
        buildFromBlocks(blocks)
      } else {
        // Pre-confirmation: show suggestions preview
        const { suggestions, error: suggestError } = await autoSuggestEventBlocks(eventId)
        if (suggestError) {
          setError(suggestError)
          setLoading(false)
          return
        }
        buildFromSuggestions(suggestions)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prep plan')
    } finally {
      setLoading(false)
    }
  }

  function buildFromBlocks(blocks: PrepBlock[]) {
    const dateMap = new Map<string, PrepPlanItem[]>()
    let total = 0
    let compCount = 0

    for (const block of blocks) {
      const date = block.block_date
      if (!dateMap.has(date)) dateMap.set(date, [])

      const station = extractStation(block.notes ?? '')
      const isComponent =
        block.block_type === 'prep_session' &&
        block.title !== 'Main Prep Session' &&
        block.title !== 'Early Prep Session'

      if (isComponent) compCount++

      dateMap.get(date)!.push({
        title: block.title,
        blockType: block.block_type,
        startTime: block.start_time,
        durationMinutes: block.estimated_duration_minutes ?? 0,
        station,
        notes: block.notes ?? '',
        isCompleted: block.is_completed,
      })

      total += block.estimated_duration_minutes ?? 0
    }

    setTotalMinutes(total)
    setComponentCount(compCount)
    setDayGroups(buildDayGroups(dateMap))
  }

  function buildFromSuggestions(suggestions: PrepBlockSuggestion[]) {
    const dateMap = new Map<string, PrepPlanItem[]>()
    let total = 0
    let compCount = 0

    for (const s of suggestions) {
      const date = s.suggested_date
      if (!dateMap.has(date)) dateMap.set(date, [])

      const station = extractStation(s.notes)
      const isComponent = !!s.component_id

      if (isComponent) compCount++

      dateMap.get(date)!.push({
        title: s.title,
        blockType: s.block_type,
        startTime: s.suggested_start_time,
        durationMinutes: s.estimated_duration_minutes,
        station,
        notes: s.notes,
        isCompleted: false,
        componentId: s.component_id,
      })

      total += s.estimated_duration_minutes
    }

    setTotalMinutes(total)
    setComponentCount(compCount)
    setDayGroups(buildDayGroups(dateMap))
  }

  function buildDayGroups(dateMap: Map<string, PrepPlanItem[]>): DayGroup[] {
    const sorted = [...dateMap.entries()].sort(([a], [b]) => a.localeCompare(b))

    return sorted.map(([date, items]) => ({
      date,
      label: formatDate(date),
      relativeLabel: getRelativeLabel(date, eventDate),
      items: items.sort((a, b) => {
        // Sort by start time if available, otherwise by title
        if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
        if (a.startTime) return -1
        if (b.startTime) return 1
        return a.title.localeCompare(b.title)
      }),
    }))
  }

  function handleRegenerate() {
    startTransition(() => {
      loadPrepPlan()
    })
  }

  // Don't render for cancelled events
  if (eventStatus === 'cancelled') return null

  // No menu assigned
  if (!hasMenu) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-2">Prep Plan</h2>
        <p className="text-sm text-stone-500">
          No menu assigned to this event yet. Assign a menu to see your prep plan.
        </p>
      </Card>
    )
  }

  // Loading
  if (loading) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-4">Prep Plan</h2>
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-stone-800 rounded w-1/3" />
          <div className="h-3 bg-stone-800 rounded w-2/3" />
          <div className="h-3 bg-stone-800 rounded w-1/2" />
        </div>
      </Card>
    )
  }

  // Error
  if (error) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-2">Prep Plan</h2>
        <p className="text-sm text-red-400">Could not load prep plan: {error}</p>
        <Button variant="ghost" size="sm" onClick={handleRegenerate} className="mt-2">
          Retry
        </Button>
      </Card>
    )
  }

  // Empty (no blocks/suggestions)
  if (dayGroups.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100 mb-2">Prep Plan</h2>
        <p className="text-sm text-stone-500">
          No make-ahead components on this menu. All prep is day-of.
        </p>
      </Card>
    )
  }

  const totalHours = Math.round((totalMinutes / 60) * 2) / 2 // round to nearest 0.5
  const prepDays = dayGroups.length

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Prep Plan</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {prepDays} prep day{prepDays > 1 ? 's' : ''}
            {componentCount > 0 &&
              ` · ${componentCount} make-ahead component${componentCount > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-stone-100">~{totalHours}h</p>
          <p className="text-xs text-stone-500">total</p>
        </div>
      </div>

      {/* Preview badge for non-confirmed events */}
      {!isConfirmedOrBeyond && (
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="info">Preview</Badge>
          <span className="text-xs text-stone-500">
            These blocks will be created when the event is confirmed
          </span>
        </div>
      )}

      {/* Day-by-day breakdown */}
      <div className="space-y-4">
        {dayGroups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-medium text-stone-300">{group.label}</p>
              <span className="text-xs text-stone-600">({group.relativeLabel})</span>
            </div>
            <div className="space-y-1.5 pl-3 border-l-2 border-stone-800">
              {group.items.map((item, i) => (
                <div key={`${group.date}-${i}`} className="flex items-center gap-3 py-1.5">
                  {/* Completion indicator */}
                  <span
                    className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center text-xs ${
                      item.isCompleted
                        ? 'bg-green-900 border-green-700 text-green-500'
                        : 'border-stone-600'
                    }`}
                  >
                    {item.isCompleted ? '\u2713' : ''}
                  </span>

                  {/* Title and details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm ${
                          item.isCompleted ? 'text-stone-500 line-through' : 'text-stone-200'
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.componentId && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          make-ahead
                        </Badge>
                      )}
                    </div>
                    {item.station && (
                      <span className="text-xs text-stone-600">station: {item.station}</span>
                    )}
                  </div>

                  {/* Duration */}
                  <span className="text-xs text-stone-500 shrink-0">
                    {item.durationMinutes > 0 ? formatDuration(item.durationMinutes) : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Regenerate button for draft/proposed events */}
      {!isConfirmedOrBeyond && (
        <div className="mt-4 pt-3 border-t border-stone-800">
          <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={isPending}>
            {isPending ? 'Regenerating...' : 'Regenerate Suggestions'}
          </Button>
        </div>
      )}
    </Card>
  )
}
