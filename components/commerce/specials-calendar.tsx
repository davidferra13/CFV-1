'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { DailySpecial, SpecialCategory } from '@/lib/commerce/daily-specials-actions'
import {
  toggleSpecialAvailability,
  deleteSpecial,
  createSpecial,
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

  const weekDates = getWeekDates(weekStart)

  // Group specials by date
  const byDate = new Map<string, DailySpecial[]>()
  for (const s of specials) {
    const list = byDate.get(s.specialDate) ?? []
    list.push(s)
    byDate.set(s.specialDate, list)
  }

  async function handleToggle(id: string) {
    startTransition(async () => {
      try {
        await toggleSpecialAvailability(id)
        router.refresh()
      } catch (err) {
        console.error('[specials] toggle error:', err)
      }
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this special?')) return
    startTransition(async () => {
      try {
        await deleteSpecial(id)
        router.refresh()
      } catch (err) {
        console.error('[specials] delete error:', err)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, idx) => {
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
                <button
                  onClick={() => setAddingDate(date)}
                  className="text-xs text-stone-500 hover:text-brand-400 transition-colors"
                >
                  +
                </button>
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
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-stone-400">
                        ${(special.priceCents / 100).toFixed(2)}
                      </span>
                      <div className="flex items-center gap-1">
                        {special.isRecurring && (
                          <span className="text-[10px] text-brand-400">recurring</span>
                        )}
                        <button
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
    </div>
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

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
          isRecurring,
          recurringDay: isRecurring ? dayOfWeek : undefined,
        })
        router.refresh()
        onClose()
      } catch (err) {
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
