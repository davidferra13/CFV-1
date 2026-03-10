'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type {
  DailySpecial,
  SpecialCategory,
  RecipeSuggestion,
} from '@/lib/commerce/daily-specials-actions'
import {
  toggleSpecialAvailability,
  deleteSpecial,
  createSpecial,
  copySpecialsToDate,
  getRecipeSuggestions,
} from '@/lib/commerce/daily-specials-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ============================================
// CATEGORY STYLES
// ============================================

const CATEGORY_COLORS: Record<SpecialCategory, string> = {
  appetizer: 'info',
  entree: 'success',
  dessert: 'warning',
  drink: 'default',
  side: 'default',
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ============================================
// SPECIALS CALENDAR
// ============================================

interface SpecialsCalendarProps {
  specials: DailySpecial[]
  weekStart: string // ISO date string (Monday)
}

function getWeekDates(weekStart: string): string[] {
  const start = new Date(weekStart + 'T12:00:00Z')
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d.toISOString().substring(0, 10))
  }
  return dates
}

export function SpecialsCalendar({ specials, weekStart }: SpecialsCalendarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [addingDate, setAddingDate] = useState<string | null>(null)
  const [copyingFrom, setCopyingFrom] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const weekDates = getWeekDates(weekStart)

  // Group specials by date
  const byDate = new Map<string, DailySpecial[]>()
  for (const s of specials) {
    const list = byDate.get(s.specialDate) ?? []
    list.push(s)
    byDate.set(s.specialDate, list)
  }

  async function handleToggle(id: string) {
    setErrorMsg(null)
    startTransition(async () => {
      try {
        await toggleSpecialAvailability(id)
        router.refresh()
      } catch (err) {
        setErrorMsg('Failed to toggle availability')
        console.error('[specials] toggle error:', err)
      }
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this special?')) return
    setErrorMsg(null)
    startTransition(async () => {
      try {
        await deleteSpecial(id)
        router.refresh()
      } catch (err) {
        setErrorMsg('Failed to delete special')
        console.error('[specials] delete error:', err)
      }
    })
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date) => {
          const daySpecials = byDate.get(date) ?? []
          const dayDate = new Date(date + 'T12:00:00Z')
          const isToday = date === new Date().toISOString().substring(0, 10)

          return (
            <div
              key={date}
              className={`rounded-lg border p-3 min-h-[200px] ${
                isToday ? 'border-brand-500 bg-brand-950/20' : 'border-stone-800 bg-stone-900/30'
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs text-stone-500">{DAY_NAMES[dayDate.getDay()]}</span>
                  <span
                    className={`text-sm font-medium ml-1 ${isToday ? 'text-brand-400' : 'text-stone-300'}`}
                  >
                    {dayDate.getDate()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {daySpecials.length > 0 && (
                    <button
                      onClick={() => setCopyingFrom(date)}
                      disabled={isPending}
                      className="text-[10px] text-stone-500 hover:text-brand-400 transition-colors"
                      title="Copy specials to another day"
                    >
                      copy
                    </button>
                  )}
                  <button
                    onClick={() => setAddingDate(date)}
                    className="text-xs text-stone-500 hover:text-brand-400 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Specials */}
              <div className="space-y-2">
                {daySpecials.map((special) => (
                  <div
                    key={special.id}
                    className={`rounded p-2 text-xs ${
                      special.available
                        ? 'bg-stone-800/60 border border-stone-700'
                        : 'bg-stone-900/40 border border-stone-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-stone-200 font-medium truncate">{special.name}</span>
                      <Badge variant={CATEGORY_COLORS[special.category] as any}>
                        {special.category}
                      </Badge>
                    </div>
                    {special.recipeId && (
                      <div className="mt-0.5">
                        <span className="text-[10px] text-brand-400">linked to recipe</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-stone-400">
                        ${(special.priceCents / 100).toFixed(2)}
                      </span>
                      <div className="flex items-center gap-1">
                        {special.isRecurring && (
                          <span className="text-[10px] text-brand-400">recurring</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggle(special.id)}
                          disabled={isPending}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            special.available
                              ? 'bg-emerald-900/40 text-emerald-400'
                              : 'bg-red-900/40 text-red-400'
                          }`}
                        >
                          {special.available ? 'Available' : 'Sold Out'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(special.id)}
                          disabled={isPending}
                          className="text-[10px] text-stone-600 hover:text-red-400 transition-colors"
                        >
                          x
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {daySpecials.length === 0 && (
                  <p className="text-[10px] text-stone-600 text-center py-4">No specials</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick add form */}
      {addingDate && <QuickAddSpecial date={addingDate} onClose={() => setAddingDate(null)} />}

      {/* Copy modal */}
      {copyingFrom && (
        <CopySpecialsModal
          fromDate={copyingFrom}
          weekDates={weekDates}
          onClose={() => setCopyingFrom(null)}
        />
      )}
    </div>
  )
}

// ============================================
// COPY SPECIALS MODAL
// ============================================

function CopySpecialsModal({
  fromDate,
  weekDates,
  onClose,
}: {
  fromDate: string
  weekDates: string[]
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [targetDate, setTargetDate] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleCopy() {
    if (!targetDate) return
    setError(null)
    setResult(null)

    startTransition(async () => {
      try {
        const res = await copySpecialsToDate(fromDate, targetDate)
        setResult(`Copied ${res.copied} special${res.copied === 1 ? '' : 's'}`)
        router.refresh()
      } catch (err) {
        setError('Failed to copy specials')
        console.error('[specials] copy error:', err)
      }
    })
  }

  const fromLabel = new Date(fromDate + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-stone-200">Copy specials from {fromLabel}</h3>
            <button type="button" onClick={onClose} className="text-stone-500 hover:text-stone-300">
              x
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-stone-400">Copy to:</label>
            <select
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-md border border-stone-700 bg-stone-900 text-stone-200 px-3 py-2 text-sm"
            >
              <option value="">Select a day</option>
              {weekDates
                .filter((d) => d !== fromDate)
                .map((d) => {
                  const dt = new Date(d + 'T12:00:00Z')
                  return (
                    <option key={d} value={d}>
                      {dt.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </option>
                  )
                })}
            </select>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="max-w-[180px]"
              placeholder="Or pick any date"
            />
            <Button
              variant="primary"
              onClick={handleCopy}
              disabled={!targetDate || isPending}
              loading={isPending}
            >
              Copy
            </Button>
          </div>

          {result && <p className="text-sm text-emerald-400">{result}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// QUICK ADD SPECIAL
// ============================================

function QuickAddSpecial({ date, onClose }: { date: string; onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<SpecialCategory>('entree')
  const [description, setDescription] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recipeId, setRecipeId] = useState('')
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([])
  const [error, setError] = useState<string | null>(null)

  // Load recipe suggestions on mount
  useEffect(() => {
    let cancelled = false
    getRecipeSuggestions()
      .then((r) => {
        if (!cancelled) setRecipes(r)
      })
      .catch(() => {
        // Non-blocking: recipe suggestions are optional
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)

    const priceCents = Math.round(parseFloat(price || '0') * 100)
    const dayOfWeek = new Date(date + 'T12:00:00Z').getDay()

    startTransition(async () => {
      try {
        await createSpecial({
          specialDate: date,
          name: name.trim(),
          description: description.trim() || undefined,
          priceCents,
          category,
          recipeId: recipeId || undefined,
          isRecurring,
          recurringDay: isRecurring ? dayOfWeek : undefined,
        })
        router.refresh()
        onClose()
      } catch (err) {
        setError('Failed to create special. Please try again.')
        console.error('[specials] create error:', err)
      }
    })
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-stone-200">
              Add Special for{' '}
              {new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </h3>
            <button type="button" onClick={onClose} className="text-stone-500 hover:text-stone-300">
              x
            </button>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded p-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input
              placeholder="Special name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SpecialCategory)}
              className="rounded-md border border-stone-700 bg-stone-900 text-stone-200 px-3 py-2 text-sm"
            >
              <option value="appetizer">Appetizer</option>
              <option value="entree">Entree</option>
              <option value="dessert">Dessert</option>
              <option value="drink">Drink</option>
              <option value="side">Side</option>
            </select>
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Recipe link */}
          {recipes.length > 0 && (
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Link to recipe (optional)</label>
              <select
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
                aria-label="Link to recipe"
                className="rounded-md border border-stone-700 bg-stone-900 text-stone-200 px-3 py-2 text-sm w-full"
              >
                <option value="">No recipe linked</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-stone-400">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-stone-600"
              />
              Repeat every {DAY_NAMES[new Date(date + 'T12:00:00Z').getDay()]}
            </label>
            <Button type="submit" variant="primary" loading={isPending}>
              Add Special
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
