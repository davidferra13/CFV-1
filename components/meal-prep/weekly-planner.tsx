'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Truck, Package, Repeat, Calendar, ChevronRight } from '@/components/ui/icons'
import type { MealPrepProgram, MealPrepWeek } from '@/lib/meal-prep/program-actions'
import {
  assignWeekMenu,
  markWeekPrepped,
  markWeekDelivered,
  advanceRotation,
  recordContainerReturn,
  suggestNextWeekMenu,
} from '@/lib/meal-prep/program-actions'

interface Menu {
  id: string
  title: string
}

interface WeeklyPlannerProps {
  program: MealPrepProgram
  weeks: MealPrepWeek[]
  menus: Menu[]
}

export function WeeklyPlanner({ program, weeks: initialWeeks, menus }: WeeklyPlannerProps) {
  const [weeks, setWeeks] = useState(initialWeeks)
  const [pending, startTransition] = useTransition()
  const [returnCount, setReturnCount] = useState(1)
  const [suggestion, setSuggestion] = useState<{
    menuId: string | null
    menuTitle: string | null
    reason: string
  } | null>(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)

  function handleAssignMenu(rotationWeek: number, menuId: string | null) {
    const previous = [...weeks]
    setWeeks((prev) =>
      prev.map((w) =>
        w.rotation_week === rotationWeek
          ? { ...w, menu_id: menuId, menu: menus.find((m) => m.id === menuId) ?? null }
          : w
      )
    )

    startTransition(async () => {
      try {
        const result = await assignWeekMenu({
          programId: program.id,
          rotationWeek,
          menuId,
        })
        if ('error' in result) {
          setWeeks(previous)
        }
      } catch {
        setWeeks(previous)
      }
    })
  }

  function handleMarkPrepped(rotationWeek: number) {
    const previous = [...weeks]
    setWeeks((prev) =>
      prev.map((w) =>
        w.rotation_week === rotationWeek ? { ...w, prepped_at: new Date().toISOString() } : w
      )
    )

    startTransition(async () => {
      try {
        const result = await markWeekPrepped(program.id, rotationWeek)
        if ('error' in result) {
          setWeeks(previous)
        }
      } catch {
        setWeeks(previous)
      }
    })
  }

  function handleMarkDelivered(rotationWeek: number) {
    const containersSent = weeks.find((w) => w.rotation_week === rotationWeek)?.containers_sent || 3
    const previous = [...weeks]
    setWeeks((prev) =>
      prev.map((w) =>
        w.rotation_week === rotationWeek ? { ...w, delivered_at: new Date().toISOString() } : w
      )
    )

    startTransition(async () => {
      try {
        const result = await markWeekDelivered(program.id, rotationWeek, containersSent)
        if ('error' in result) {
          setWeeks(previous)
        }
      } catch {
        setWeeks(previous)
      }
    })
  }

  function handleAdvanceRotation() {
    startTransition(async () => {
      try {
        await advanceRotation(program.id)
      } catch {
        // Revalidation will handle state refresh
      }
    })
  }

  function handleRecordReturn() {
    if (returnCount <= 0) return
    startTransition(async () => {
      try {
        const result = await recordContainerReturn(program.id, returnCount)
        if (!('error' in result)) {
          setReturnCount(1)
        }
      } catch {
        // revalidation will refresh
      }
    })
  }

  async function handleSuggestMenu() {
    setLoadingSuggestion(true)
    setSuggestion(null)
    try {
      const result = await suggestNextWeekMenu(program.id, 3)
      setSuggestion(result)
    } catch {
      setSuggestion({ menuId: null, menuTitle: null, reason: 'Could not load suggestion' })
    } finally {
      setLoadingSuggestion(false)
    }
  }

  function handleApplySuggestion(rotationWeek: number) {
    if (!suggestion?.menuId) return
    handleAssignMenu(rotationWeek, suggestion.menuId)
    setSuggestion(null)
  }

  function getWeekStatus(week: MealPrepWeek): {
    label: string
    variant: 'success' | 'warning' | 'info' | 'default'
  } {
    if (week.delivered_at) return { label: 'Delivered', variant: 'success' }
    if (week.prepped_at) return { label: 'Prepped', variant: 'info' }
    if (week.menu_id || (week.custom_dishes && week.custom_dishes.length > 0)) {
      return { label: 'Menu Set', variant: 'warning' }
    }
    return { label: 'Unplanned', variant: 'default' }
  }

  return (
    <div className="space-y-6">
      {/* Rotation header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-stone-800 rounded-lg">
            <Repeat className="w-5 h-5 text-stone-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-200">
              {program.rotation_weeks}-Week Rotation
            </h2>
            <p className="text-sm text-stone-500">
              Currently on Week {program.current_rotation_week}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" disabled={pending} onClick={handleAdvanceRotation}>
          <ChevronRight className="w-4 h-4 mr-1" />
          Advance Week
        </Button>
      </div>

      {/* Container tracking */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-stone-200">Container Tracking</p>
              <p className="text-xs text-stone-500">
                {program.containers_out} out, {program.containers_returned} returned total
                {program.container_deposit_cents > 0 && (
                  <> (${(program.container_deposit_cents / 100).toFixed(2)} deposit each)</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={99}
              value={returnCount}
              onChange={(e) => setReturnCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1.5 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200 text-center"
            />
            <Button variant="secondary" size="sm" disabled={pending} onClick={handleRecordReturn}>
              Record Return
            </Button>
          </div>
        </div>
      </Card>

      {/* Weekly grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weeks.map((week) => {
          const status = getWeekStatus(week)
          const isCurrent = week.rotation_week === program.current_rotation_week

          return (
            <Card
              key={week.id}
              className={`p-4 space-y-3 ${isCurrent ? 'ring-2 ring-amber-600/50' : ''}`}
            >
              {/* Week header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-stone-500" />
                  <span className="font-medium text-stone-200">Week {week.rotation_week}</span>
                  {isCurrent && <Badge variant="warning">Current</Badge>}
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>

              {/* Menu selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-500">Menu</label>
                  {isCurrent && !week.delivered_at && (
                    <button
                      type="button"
                      onClick={handleSuggestMenu}
                      disabled={loadingSuggestion || pending}
                      className="text-xs text-amber-500 hover:text-amber-400 disabled:opacity-40 transition-colors"
                    >
                      {loadingSuggestion ? 'Finding...' : 'Suggest'}
                    </button>
                  )}
                </div>
                <select
                  value={week.menu_id ?? ''}
                  onChange={(e) => handleAssignMenu(week.rotation_week, e.target.value || null)}
                  disabled={pending || !!week.delivered_at}
                  className="w-full px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-200 disabled:opacity-50"
                >
                  <option value="">No menu assigned</option>
                  {menus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.title}
                    </option>
                  ))}
                </select>
                {isCurrent && suggestion && (
                  <div className="mt-2 rounded-md bg-amber-950 border border-amber-800 px-3 py-2">
                    <p className="text-xs text-amber-300 font-medium">
                      Suggestion: {suggestion.menuTitle ?? 'No menus available'}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">{suggestion.reason}</p>
                    {suggestion.menuId && (
                      <button
                        type="button"
                        onClick={() => handleApplySuggestion(week.rotation_week)}
                        className="mt-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        Apply this menu
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Custom dishes display */}
              {week.custom_dishes && week.custom_dishes.length > 0 && (
                <div>
                  <p className="text-xs text-stone-500 mb-1">Custom Dishes</p>
                  <ul className="space-y-1">
                    {week.custom_dishes.map((dish: any, i: number) => (
                      <li key={i} className="text-sm text-stone-400">
                        {dish.name}
                        {dish.servings ? ` (${dish.servings} servings)` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              {week.notes && <p className="text-xs text-stone-500 italic">{week.notes}</p>}

              {/* Container info for delivered weeks */}
              {week.delivered_at && week.containers_sent > 0 && (
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Package className="w-3.5 h-3.5" />
                  {week.containers_sent} containers sent
                  {week.containers_back > 0 && `, ${week.containers_back} back`}
                </div>
              )}

              {/* Action buttons */}
              {!week.delivered_at && (
                <div className="flex gap-2 pt-1">
                  {!week.prepped_at && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => handleMarkPrepped(week.rotation_week)}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Mark Prepped
                    </Button>
                  )}
                  {week.prepped_at && !week.delivered_at && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={pending}
                      onClick={() => handleMarkDelivered(week.rotation_week)}
                    >
                      <Truck className="w-3.5 h-3.5 mr-1" />
                      Mark Delivered
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
