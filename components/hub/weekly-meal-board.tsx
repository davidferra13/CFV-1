'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import type {
  MealBoardEntry,
  MealType,
  MealStatus,
  MealReaction,
  MealFeedbackSummary,
} from '@/lib/hub/types'
import {
  upsertMealEntry,
  deleteMealEntry,
  cloneWeekMeals,
  getMealBoard,
  saveWeekAsTemplate,
  getTemplates,
  loadTemplate,
  getScheduleChanges,
  getGroupDefaultHeadCount,
  updateMealStatus,
  getBatchCommentCounts,
  type MealTemplate,
  type ScheduleChange,
} from '@/lib/hub/meal-board-actions'
import { getBatchMealFeedback } from '@/lib/hub/meal-feedback-actions'
import { MealFeedbackInline } from './meal-feedback'
import { ScheduleChangeBadge } from './schedule-change-flag'
import { WeekSummaryCard } from './week-summary-card'
import { FeedbackInsightsPanel } from './feedback-insights-panel'
import { RecurringMealsManager } from './recurring-meals-manager'
import { MealAttendance } from './meal-attendance'
import { TodaysMealsCard } from './todays-meals-card'
import { DietaryDashboard } from './dietary-dashboard'
import { WeeklyPrepSummary } from './weekly-prep-summary'
import { MealCommentTrigger } from './meal-comments'
import { MealRequests } from './meal-requests'
import { MealTimeSettings } from './meal-time-settings'
import type { DefaultMealTimes } from '@/lib/hub/types'
import { getDefaultMealTimes } from '@/lib/hub/meal-board-actions'

// ---------------------------------------------------------------------------
// Date helpers (ISO weeks: Monday = start)
// ---------------------------------------------------------------------------

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDateISO(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6)
  const startMonth = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endMonth = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${startMonth} - ${endMonth}`
}

function formatServingTime(time: string): string {
  // Handle both HH:MM and HH:MM:SS from postgres
  const parts = time.split(':')
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`
}

function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner']

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

interface WeeklyMealBoardProps {
  groupId: string
  groupToken?: string
  initialEntries: MealBoardEntry[]
  profileToken: string | null
  isChefOrAdmin: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeeklyMealBoard({
  groupId,
  groupToken,
  initialEntries,
  profileToken,
  isChefOrAdmin,
}: WeeklyMealBoardProps) {
  const [entries, setEntries] = useState<MealBoardEntry[]>(initialEntries)
  const [weekOffset, setWeekOffset] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [editingSlot, setEditingSlot] = useState<{
    date: string
    mealType: MealType
  } | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [feedbackData, setFeedbackData] = useState<
    Record<string, { summary: MealFeedbackSummary; myReaction: MealReaction | null }>
  >({})
  const [showCloneMenu, setShowCloneMenu] = useState(false)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [scheduleChanges, setScheduleChanges] = useState<ScheduleChange[]>([])
  const [defaultHeadCount, setDefaultHeadCount] = useState<number | null>(null)
  const [editHeadCount, setEditHeadCount] = useState<string>('')
  const [editPrepNotes, setEditPrepNotes] = useState<string>('')
  const [editServingTime, setEditServingTime] = useState<string>('')
  const [defaultMealTimes, setDefaultMealTimes] = useState<DefaultMealTimes | null>(null)
  const [showMealTimeSettings, setShowMealTimeSettings] = useState(false)
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  // Load default head count and meal times
  useEffect(() => {
    getGroupDefaultHeadCount(groupId)
      .then(setDefaultHeadCount)
      .catch(() => {})
    getDefaultMealTimes(groupId)
      .then(setDefaultMealTimes)
      .catch(() => {})
  }, [groupId])

  // Current week's Monday
  const currentMonday = getMonday(addDays(new Date(), weekOffset * 7))
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentMonday, i))

  // Filter entries for current week
  const weekStart = formatDateISO(currentMonday)
  const weekEnd = formatDateISO(addDays(currentMonday, 6))
  const weekEntries = entries.filter((e) => e.meal_date >= weekStart && e.meal_date <= weekEnd)

  // Get entry for a specific slot
  const getEntry = useCallback(
    (date: string, mealType: MealType) =>
      weekEntries.find((e) => e.meal_date === date && e.meal_type === mealType),
    [weekEntries]
  )

  // Load schedule changes for current week
  const refreshScheduleChanges = useCallback(() => {
    getScheduleChanges({ groupId, startDate: weekStart, endDate: weekEnd })
      .then(setScheduleChanges)
      .catch(() => {})
  }, [groupId, weekStart, weekEnd])

  useEffect(() => {
    refreshScheduleChanges()
  }, [refreshScheduleChanges])

  // Load feedback and comment counts for visible entries
  useEffect(() => {
    const entryIds = weekEntries.map((e) => e.id).filter((id) => !id.startsWith('temp-'))
    if (entryIds.length === 0) return
    getBatchMealFeedback({ mealEntryIds: entryIds, profileToken })
      .then(setFeedbackData)
      .catch(() => {})
    getBatchCommentCounts(entryIds)
      .then(setCommentCounts)
      .catch(() => {})
  }, [weekEntries.map((e) => e.id).join(','), profileToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate weeks
  const goToThisWeek = () => setWeekOffset(0)
  const goPrevWeek = () => setWeekOffset((w) => w - 1)
  const goNextWeek = () => setWeekOffset((w) => w + 1)

  // Start editing a slot
  const startEditing = (date: string, mealType: MealType) => {
    const existing = getEntry(date, mealType)
    setEditingSlot({ date, mealType })
    setEditTitle(existing?.title ?? '')
    setEditDescription(existing?.description ?? '')
    setEditHeadCount(existing?.head_count?.toString() ?? '')
    setEditPrepNotes(existing?.prep_notes ?? '')
    setEditServingTime(existing?.serving_time?.substring(0, 5) ?? '')
    setError(null)
  }

  const cancelEditing = () => {
    setEditingSlot(null)
    setEditTitle('')
    setEditDescription('')
    setError(null)
  }

  // Save a meal entry
  const saveEntry = (date: string, mealType: MealType) => {
    if (!profileToken || !editTitle.trim()) return

    const existing = getEntry(date, mealType)
    const parsedHeadCount = editHeadCount ? parseInt(editHeadCount, 10) : null

    const optimisticEntry: MealBoardEntry = {
      id: existing?.id ?? `temp-${Date.now()}`,
      group_id: groupId,
      author_profile_id: '',
      meal_date: date,
      meal_type: mealType,
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      dietary_tags: existing?.dietary_tags ?? [],
      allergen_flags: existing?.allergen_flags ?? [],
      menu_id: null,
      dish_id: null,
      head_count: parsedHeadCount,
      prep_notes: editPrepNotes.trim() || null,
      serving_time: editServingTime || null,
      status: 'planned',
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Optimistic update
    const previous = [...entries]
    setEntries((prev) => {
      const filtered = prev.filter((e) => !(e.meal_date === date && e.meal_type === mealType))
      return [...filtered, optimisticEntry]
    })
    setEditingSlot(null)
    setEditTitle('')
    setEditDescription('')

    startTransition(async () => {
      try {
        const result = await upsertMealEntry({
          groupId,
          profileToken,
          mealDate: date,
          mealType,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          headCount: parsedHeadCount,
          prepNotes: editPrepNotes.trim() || null,
          servingTime: editServingTime || null,
        })
        if (!result.success) {
          setEntries(previous)
          setError(result.error ?? 'Failed to save')
        } else if (result.entry) {
          // Replace optimistic entry with real one
          setEntries((prev) =>
            prev.map((e) => (e.meal_date === date && e.meal_type === mealType ? result.entry! : e))
          )
        }
      } catch {
        setEntries(previous)
        setError('Failed to save meal entry')
      }
    })
  }

  // Update meal status (chef/admin only)
  const handleStatusChange = (entryId: string, newStatus: MealStatus) => {
    if (!profileToken) return

    const previous = [...entries]
    // Optimistic update
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, status: newStatus } : e)))

    startTransition(async () => {
      try {
        const result = await updateMealStatus({
          entryId,
          profileToken,
          status: newStatus,
        })
        if (!result.success) {
          setEntries(previous)
          setError(result.error ?? 'Failed to update status')
        } else if (result.entry) {
          setEntries((prev) => prev.map((e) => (e.id === entryId ? result.entry! : e)))
        }
      } catch {
        setEntries(previous)
        setError('Failed to update meal status')
      }
    })
  }

  // Delete a meal entry
  const deleteEntry = (entryId: string) => {
    if (!profileToken) return

    const previous = [...entries]
    setEntries((prev) => prev.filter((e) => e.id !== entryId))

    startTransition(async () => {
      try {
        const result = await deleteMealEntry({ entryId, profileToken })
        if (!result.success) {
          setEntries(previous)
          setError(result.error ?? 'Failed to delete')
        }
      } catch {
        setEntries(previous)
        setError('Failed to delete meal entry')
      }
    })
  }

  // Clone week to next/prev
  const handleClone = (direction: 'next' | 'prev') => {
    if (!profileToken) return
    setShowCloneMenu(false)
    const targetMonday = addDays(currentMonday, direction === 'next' ? 7 : -7)

    startTransition(async () => {
      try {
        const result = await cloneWeekMeals({
          groupId,
          profileToken,
          sourceWeekStart: formatDateISO(currentMonday),
          targetWeekStart: formatDateISO(targetMonday),
        })
        if (result.success) {
          setWeekOffset((w) => w + (direction === 'next' ? 1 : -1))
          const fresh = await getMealBoard({ groupId, groupToken })
          setEntries(fresh)
        } else {
          setError(result.error ?? 'Failed to clone')
        }
      } catch {
        setError('Failed to clone week')
      }
    })
  }

  // Save week as template
  const handleSaveTemplate = () => {
    if (!profileToken || !templateName.trim()) return

    startTransition(async () => {
      try {
        const result = await saveWeekAsTemplate({
          groupId,
          profileToken,
          weekStart: formatDateISO(currentMonday),
          name: templateName.trim(),
        })
        if (result.success) {
          setShowSaveTemplate(false)
          setTemplateName('')
          const fresh = await getTemplates(groupId)
          setTemplates(fresh)
        } else {
          setError(result.error ?? 'Failed to save template')
        }
      } catch {
        setError('Failed to save template')
      }
    })
  }

  // Load template onto current week
  const handleLoadTemplate = (templateId: string) => {
    if (!profileToken) return
    setShowTemplateMenu(false)

    startTransition(async () => {
      try {
        const result = await loadTemplate({
          groupId,
          profileToken,
          templateId,
          targetWeekStart: formatDateISO(currentMonday),
        })
        if (result.success) {
          const fresh = await getMealBoard({ groupId, groupToken })
          setEntries(fresh)
        } else {
          setError(result.error ?? 'Failed to load template')
        }
      } catch {
        setError('Failed to load template')
      }
    })
  }

  // Load templates list when entering edit mode
  useEffect(() => {
    if (editMode && isChefOrAdmin) {
      getTemplates(groupId)
        .then(setTemplates)
        .catch(() => {})
    }
  }, [editMode, isChefOrAdmin, groupId])

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Today's meals hero (only on current week view) */}
      {weekOffset === 0 && !editMode && (
        <TodaysMealsCard
          entries={entries}
          defaultHeadCount={defaultHeadCount}
          defaultMealTimes={defaultMealTimes}
          isChefOrAdmin={isChefOrAdmin}
          onStatusChange={profileToken ? handleStatusChange : undefined}
        />
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrevWeek}
          className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
        >
          ← Prev
        </button>

        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-stone-200">{formatWeekRange(currentMonday)}</h3>
          {weekOffset !== 0 && (
            <button
              onClick={goToThisWeek}
              className="rounded-full bg-stone-700 px-2 py-0.5 text-xs text-stone-400 hover:bg-stone-600"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={goNextWeek}
          className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
        >
          Next →
        </button>
      </div>

      {/* Edit mode toggle + meal time settings (chef/admin only) */}
      {isChefOrAdmin && profileToken && (
        <div className="flex justify-end gap-2">
          {editMode && (
            <button
              type="button"
              onClick={() => setShowMealTimeSettings(true)}
              className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-700"
            >
              🕐 Meal Times
            </button>
          )}
          <button
            onClick={() => {
              setEditMode(!editMode)
              setEditingSlot(null)
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              editMode
                ? 'bg-[var(--hub-primary,#e88f47)] text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {editMode ? '✓ Done Editing' : '✎ Edit Meals'}
          </button>
        </div>
      )}

      {/* Meal time settings modal */}
      {showMealTimeSettings && profileToken && (
        <MealTimeSettings
          groupId={groupId}
          profileToken={profileToken}
          onClose={() => setShowMealTimeSettings(false)}
          onSaved={setDefaultMealTimes}
        />
      )}

      {/* Chef tools (clone, templates) - only in edit mode */}
      {editMode && isChefOrAdmin && profileToken && (
        <div className="flex flex-wrap gap-2">
          {/* Clone */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowCloneMenu(!showCloneMenu)
                setShowTemplateMenu(false)
                setShowSaveTemplate(false)
              }}
              disabled={weekEntries.length === 0 || isPending}
              className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-700 disabled:opacity-40"
            >
              Clone Week...
            </button>
            {showCloneMenu && (
              <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-stone-700 bg-stone-800 py-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => handleClone('next')}
                  className="w-full px-3 py-1.5 text-left text-xs text-stone-300 hover:bg-stone-700"
                >
                  → Next Week
                </button>
                <button
                  type="button"
                  onClick={() => handleClone('prev')}
                  className="w-full px-3 py-1.5 text-left text-xs text-stone-300 hover:bg-stone-700"
                >
                  ← Previous Week
                </button>
              </div>
            )}
          </div>

          {/* Save as Template */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowSaveTemplate(!showSaveTemplate)
                setShowCloneMenu(false)
                setShowTemplateMenu(false)
              }}
              disabled={weekEntries.length === 0 || isPending}
              className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-700 disabled:opacity-40"
            >
              Save Template
            </button>
            {showSaveTemplate && (
              <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-stone-700 bg-stone-800 p-3 shadow-xl">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name..."
                  className="mb-2 w-full rounded bg-stone-700 px-2 py-1.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
                  maxLength={100}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && templateName.trim()) handleSaveTemplate()
                    if (e.key === 'Escape') setShowSaveTemplate(false)
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim() || isPending}
                  className="w-full rounded bg-[var(--hub-primary,#e88f47)] px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {/* Load Template */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowTemplateMenu(!showTemplateMenu)
                setShowCloneMenu(false)
                setShowSaveTemplate(false)
              }}
              disabled={isPending}
              className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-700 disabled:opacity-40"
            >
              Load Template
            </button>
            {showTemplateMenu && (
              <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-stone-700 bg-stone-800 py-1 shadow-xl">
                {templates.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-stone-500">No templates saved yet</p>
                ) : (
                  templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleLoadTemplate(t.id)}
                      className="w-full px-3 py-1.5 text-left text-xs text-stone-300 hover:bg-stone-700"
                    >
                      {t.name}
                      <span className="ml-1 text-stone-500">
                        ({(t.entries as unknown[]).length} meals)
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Week summary card */}
      <WeekSummaryCard
        weekEntries={weekEntries}
        scheduleChanges={scheduleChanges}
        defaultHeadCount={defaultHeadCount}
        feedbackData={feedbackData}
      />

      {/* Dietary dashboard (chef only, collapsible) */}
      <DietaryDashboard groupId={groupId} isChefOrAdmin={isChefOrAdmin} />

      {/* Weekly prep summary (chef only, collapsible) */}
      {isChefOrAdmin && (
        <WeeklyPrepSummary
          weekEntries={weekEntries}
          defaultHeadCount={defaultHeadCount}
          weekLabel={formatWeekRange(currentMonday)}
          defaultMealTimes={defaultMealTimes}
        />
      )}

      {/* Meal requests from family members */}
      {!editMode && (
        <MealRequests groupId={groupId} profileToken={profileToken} isChefOrAdmin={isChefOrAdmin} />
      )}

      {/* Recurring meals manager (chef edit mode) */}
      {editMode && isChefOrAdmin && profileToken && (
        <RecurringMealsManager
          groupId={groupId}
          profileToken={profileToken}
          currentWeekStart={weekStart}
          onMealsApplied={async () => {
            const fresh = await getMealBoard({ groupId, groupToken })
            setEntries(fresh)
          }}
        />
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-xs text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-200">
            ✕
          </button>
        </div>
      )}

      {/* Day grid */}
      <div className="space-y-2">
        {weekDays.map((day) => {
          const dateStr = formatDateISO(day)
          const dayIsToday = isToday(day)

          return (
            <div
              key={dateStr}
              className={`group rounded-xl border ${
                dayIsToday
                  ? 'border-[var(--hub-primary,#e88f47)]/40 bg-stone-900/80'
                  : 'border-stone-800 bg-stone-900/40'
              } p-3`}
            >
              {/* Day header */}
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`text-xs font-semibold ${
                    dayIsToday ? 'text-[var(--hub-primary,#e88f47)]' : 'text-stone-400'
                  }`}
                >
                  {formatDateShort(day)}
                </span>
                {dayIsToday && (
                  <span className="rounded-full bg-[var(--hub-primary,#e88f47)]/20 px-2 py-0.5 text-xs text-[var(--hub-primary,#e88f47)]">
                    Today
                  </span>
                )}
                <ScheduleChangeBadge
                  changes={scheduleChanges}
                  dateStr={dateStr}
                  groupId={groupId}
                  profileToken={profileToken}
                  isChefOrAdmin={isChefOrAdmin}
                  onUpdate={refreshScheduleChanges}
                />
              </div>

              {/* Meal slots */}
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                {MEAL_TYPES.map((mealType) => {
                  const entry = getEntry(dateStr, mealType)
                  const isEditing =
                    editingSlot?.date === dateStr && editingSlot?.mealType === mealType

                  return (
                    <div
                      key={mealType}
                      className={`rounded-lg border ${
                        entry
                          ? 'border-stone-700 bg-stone-800/60'
                          : 'border-stone-800/50 bg-stone-900/30'
                      } p-2`}
                    >
                      {/* Meal type label */}
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-stone-500">
                            {MEAL_EMOJI[mealType]} {MEAL_LABELS[mealType]}
                          </span>
                          {entry && entry.status !== 'planned' && (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                                entry.status === 'confirmed'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : entry.status === 'served'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {entry.status}
                            </span>
                          )}
                        </div>
                        {editMode && entry && !isEditing && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEditing(dateStr, mealType)}
                              className="text-xs text-stone-500 hover:text-stone-300"
                              title="Edit"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="text-xs text-stone-500 hover:text-red-400"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Edit form */}
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Dish name..."
                            className="w-full rounded bg-stone-700 px-2 py-1 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
                            autoFocus
                            maxLength={200}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && editTitle.trim()) {
                                saveEntry(dateStr, mealType)
                              }
                              if (e.key === 'Escape') cancelEditing()
                            }}
                          />
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Notes (optional)..."
                            className="w-full rounded bg-stone-700 px-2 py-1 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
                            maxLength={500}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && editTitle.trim()) {
                                saveEntry(dateStr, mealType)
                              }
                              if (e.key === 'Escape') cancelEditing()
                            }}
                          />
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={editHeadCount}
                              onChange={(e) => setEditHeadCount(e.target.value)}
                              placeholder="👥 Heads"
                              min={0}
                              max={100}
                              className="w-20 rounded bg-stone-700 px-2 py-1 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
                            />
                            <input
                              type="time"
                              value={editServingTime}
                              onChange={(e) => setEditServingTime(e.target.value)}
                              className="w-24 rounded bg-stone-700 px-2 py-1 text-xs text-stone-100 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)] [color-scheme:dark]"
                              title="Serving time (overrides default)"
                            />
                            <input
                              type="text"
                              value={editPrepNotes}
                              onChange={(e) => setEditPrepNotes(e.target.value)}
                              placeholder="Prep notes (chef only)..."
                              className="flex-1 rounded bg-stone-700 px-2 py-1 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
                              maxLength={1000}
                            />
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEntry(dateStr, mealType)}
                              disabled={!editTitle.trim() || isPending}
                              className="rounded bg-[var(--hub-primary,#e88f47)] px-2 py-0.5 text-xs font-medium text-white disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="rounded bg-stone-700 px-2 py-0.5 text-xs text-stone-400 hover:bg-stone-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : entry ? (
                        /* Populated slot */
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-medium text-stone-200 leading-tight">
                              {entry.title}
                            </p>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {(entry.serving_time ?? defaultMealTimes?.[mealType]) && (
                                <span className="text-[10px] text-stone-500" title="Serving time">
                                  🕐
                                  {formatServingTime(
                                    entry.serving_time ?? defaultMealTimes![mealType]!
                                  )}
                                </span>
                              )}
                              {(entry.head_count ?? defaultHeadCount) && (
                                <span className="text-[10px] text-stone-500" title="Head count">
                                  👥{entry.head_count ?? defaultHeadCount}
                                </span>
                              )}
                            </div>
                          </div>
                          {entry.description && (
                            <p className="mt-0.5 text-xs text-stone-500 leading-tight">
                              {entry.description}
                            </p>
                          )}
                          {/* Chef prep notes (chef only) */}
                          {isChefOrAdmin && entry.prep_notes && (
                            <p className="mt-0.5 text-[10px] text-amber-600 leading-tight italic">
                              {entry.prep_notes}
                            </p>
                          )}
                          {/* Dietary tags */}
                          {(entry.dietary_tags.length > 0 || entry.allergen_flags.length > 0) && (
                            <div className="mt-1 flex flex-wrap gap-0.5">
                              {entry.dietary_tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-emerald-900/40 px-1.5 py-0.5 text-[10px] text-emerald-400"
                                >
                                  {tag}
                                </span>
                              ))}
                              {entry.allergen_flags.map((flag) => (
                                <span
                                  key={flag}
                                  className="rounded-full bg-amber-900/40 px-1.5 py-0.5 text-[10px] text-amber-400"
                                >
                                  ⚠ {flag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Attendance + comments (who's eating, discuss) */}
                          {!editMode && !entry.id.startsWith('temp-') && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <MealAttendance groupId={groupId} mealEntryId={entry.id} compact />
                              <MealCommentTrigger
                                mealEntryId={entry.id}
                                profileToken={profileToken}
                                mealTitle={entry.title}
                                initialCount={commentCounts[entry.id] ?? 0}
                              />
                            </div>
                          )}

                          {/* Meal feedback */}
                          {!editMode && !entry.id.startsWith('temp-') && (
                            <MealFeedbackInline
                              mealEntryId={entry.id}
                              profileToken={profileToken}
                              initialSummary={
                                feedbackData[entry.id]?.summary ?? {
                                  loved: 0,
                                  liked: 0,
                                  neutral: 0,
                                  disliked: 0,
                                  total: 0,
                                  notes: [],
                                }
                              }
                              initialMyReaction={feedbackData[entry.id]?.myReaction ?? null}
                              isChefOrAdmin={isChefOrAdmin}
                            />
                          )}
                        </div>
                      ) : editMode ? (
                        /* Empty slot in edit mode */
                        <button
                          onClick={() => startEditing(dateStr, mealType)}
                          className="flex w-full items-center justify-center rounded border border-dashed border-stone-700 py-2 text-xs text-stone-600 hover:border-stone-500 hover:text-stone-400"
                        >
                          + Add
                        </button>
                      ) : (
                        /* Empty slot in view mode */
                        <p className="py-1 text-center text-xs text-stone-700">-</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Feedback intelligence (chef only, below the grid) */}
      <FeedbackInsightsPanel groupId={groupId} isChefOrAdmin={isChefOrAdmin} />

      {/* Empty state */}
      {weekEntries.length === 0 && !editMode && (
        <div className="py-8 text-center">
          <p className="text-2xl">🍽️</p>
          <p className="mt-2 text-sm text-stone-500">No meals planned for this week yet.</p>
          <p className="text-xs text-stone-600">The chef will post the weekly menu here.</p>
        </div>
      )}
    </div>
  )
}
