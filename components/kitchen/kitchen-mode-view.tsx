'use client'

// Kitchen Mode View: Full-screen event service UI
// Dark theme, large type, touch-friendly, tablet-optimized.
// Sections: Course Progress, Timers, Dietary Alerts, Quick Actions.

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { KitchenModeData } from '@/lib/kitchen/kitchen-mode-actions'
import { CourseTracker, type CourseItem } from './course-tracker'
import { useKitchenTimers, KitchenTimerDisplay } from './kitchen-timer'
import { DietaryCheatSheet } from './dietary-cheat-sheet'

type ActiveTab = 'courses' | 'timers' | 'dietary' | 'notes'

const TIMER_PRESETS = [
  { label: '5m', minutes: 5 },
  { label: '10m', minutes: 10 },
  { label: '15m', minutes: 15 },
  { label: '20m', minutes: 20 },
  { label: '30m', minutes: 30 },
]

interface KitchenModeViewProps {
  data: KitchenModeData
}

export function KitchenModeView({ data }: KitchenModeViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ActiveTab>('courses')
  const [courses, setCourses] = useState<CourseItem[]>(
    data.courses.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      status: c.status,
    }))
  )
  const [kitchenNotes, setKitchenNotes] = useState<string[]>([])
  const [noteInput, setNoteInput] = useState('')
  const { timers, addTimer, removeTimer, clearAllTimers } = useKitchenTimers()
  const [customMinutes, setCustomMinutes] = useState('')
  const [customLabel, setCustomLabel] = useState('')

  // Cleanup timers on unmount
  useEffect(() => {
    return () => { clearAllTimers() }
  }, [clearAllTimers])

  const handleCourseStatusChange = useCallback(
    (courseId: string, newStatus: 'pending' | 'plating' | 'served') => {
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, status: newStatus } : c))
      )
      const course = courses.find((c) => c.id === courseId)
      if (course) {
        const statusLabel = newStatus === 'served' ? 'Served' : newStatus === 'plating' ? 'Plating' : 'Pending'
        toast.success(`${course.name}: ${statusLabel}`)
      }
    },
    [courses]
  )

  const handleAddNote = useCallback(() => {
    const text = noteInput.trim()
    if (!text) return
    setKitchenNotes((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${text}`])
    setNoteInput('')
    toast.success('Note added')
  }, [noteInput])

  const handleAddCustomTimer = useCallback(() => {
    const mins = parseInt(customMinutes)
    if (isNaN(mins) || mins <= 0) {
      toast.error('Enter a valid number of minutes')
      return
    }
    addTimer(mins, customLabel.trim() || undefined)
    toast.success(`Timer set: ${mins} min`)
    setCustomMinutes('')
    setCustomLabel('')
  }, [customMinutes, customLabel, addTimer])

  const handleExit = useCallback(() => {
    router.push(`/events/${data.event.id}`)
  }, [router, data.event.id])

  const eventTitle = data.event.title || data.event.occasion || 'Service'
  const servedCount = courses.filter((c) => c.status === 'served').length
  const totalCourses = courses.length

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
      style={{ backgroundColor: '#1a1a1a', color: '#ffffff', fontSize: '18px' }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-bold text-white truncate" style={{ fontSize: '24px' }}>
            {eventTitle}
          </h1>
          {data.event.clientName && (
            <span className="text-zinc-400 text-base hidden sm:inline">
              for {data.event.clientName}
            </span>
          )}
          <span className="text-zinc-500 text-sm">
            {data.event.guestCount} guest{data.event.guestCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {totalCourses > 0 && (
            <span className="text-emerald-400 text-base font-medium">
              {servedCount}/{totalCourses}
            </span>
          )}
          {timers.length > 0 && (
            <span className="text-amber-400 text-base font-medium">
              {timers.length} timer{timers.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={handleExit}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base transition-colors"
            style={{ minHeight: '48px' }}
          >
            Exit
          </button>
        </div>
      </header>

      {/* Tab navigation */}
      <nav className="flex border-b border-zinc-800 bg-zinc-900/50 shrink-0">
        {(
          [
            { key: 'courses' as const, label: 'Courses', count: totalCourses },
            { key: 'timers' as const, label: 'Timers', count: timers.length },
            { key: 'dietary' as const, label: 'Dietary', count: data.guests.length + (data.event.allergies.length > 0 ? 1 : 0) },
            { key: 'notes' as const, label: 'Notes', count: kitchenNotes.length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex-1 px-4 py-3 text-center font-medium text-lg transition-colors
              ${activeTab === tab.key
                ? 'text-white border-b-2 border-emerald-500 bg-zinc-800/50'
                : 'text-zinc-500 hover:text-zinc-300'
              }
            `}
            style={{ minHeight: '56px' }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 text-sm bg-zinc-700 px-2 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Courses tab */}
        {activeTab === 'courses' && (
          <CourseTracker
            courses={courses}
            serviceStartedAt={data.event.serviceStartedAt}
            onCourseStatusChange={handleCourseStatusChange}
          />
        )}

        {/* Timers tab */}
        {activeTab === 'timers' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Timers</h2>

            {/* Preset buttons */}
            <div className="flex flex-wrap gap-3">
              {TIMER_PRESETS.map((preset) => (
                <button
                  key={preset.minutes}
                  onClick={() => {
                    addTimer(preset.minutes)
                    toast.success(`Timer set: ${preset.minutes} min`)
                  }}
                  className="px-6 py-4 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-xl transition-colors"
                  style={{ minHeight: '56px', minWidth: '80px' }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom timer */}
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-zinc-400 text-sm block mb-1">Minutes</label>
                <input
                  type="number"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="Min"
                  className="w-24 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-white text-lg"
                  min={1}
                  max={999}
                />
              </div>
              <div>
                <label className="text-zinc-400 text-sm block mb-1">Label (optional)</label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Risotto"
                  className="w-48 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-white text-lg"
                />
              </div>
              <button
                onClick={handleAddCustomTimer}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg transition-colors"
                style={{ minHeight: '52px' }}
              >
                Start Timer
              </button>
            </div>

            {/* Active timers display */}
            <div className="mt-6">
              <KitchenTimerDisplay timers={timers} onRemove={removeTimer} />
              {timers.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-lg">
                  No active timers. Tap a preset or set a custom timer above.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dietary tab */}
        {activeTab === 'dietary' && (
          <DietaryCheatSheet
            guests={data.guests}
            eventDietary={data.event.dietaryRestrictions}
            eventAllergies={data.event.allergies}
            specialRequests={data.event.specialRequests}
          />
        )}

        {/* Notes tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Kitchen Notes</h2>

            {/* Kitchen notes from event */}
            {data.event.kitchenNotes && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
                <div className="text-zinc-400 text-sm font-medium mb-1">Pre-service Notes</div>
                <div className="text-zinc-200 text-lg whitespace-pre-wrap">{data.event.kitchenNotes}</div>
              </div>
            )}

            {/* Add note input */}
            <div className="flex gap-3">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNote()
                }}
                placeholder="Add a note during service..."
                className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-white text-lg"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteInput.trim()}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg transition-colors"
                style={{ minHeight: '52px' }}
              >
                Add
              </button>
            </div>

            {/* Live notes list */}
            {kitchenNotes.length > 0 && (
              <div className="space-y-2">
                {kitchenNotes.map((note, i) => (
                  <div key={i} className="px-4 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-200 text-lg">
                    {note}
                  </div>
                ))}
              </div>
            )}

            {kitchenNotes.length === 0 && !data.event.kitchenNotes && (
              <div className="text-center py-8 text-zinc-500 text-lg">
                No notes yet. Add notes during service for your after-action review.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
