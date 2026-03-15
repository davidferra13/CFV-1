'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getOrderingWindows,
  saveOrderingWindows,
  type MealPrepWindow,
} from '@/lib/store/meal-prep-actions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface WindowRow {
  day_of_week: number
  order_cutoff_time: string
  fulfillment_day_offset: number
  is_active: boolean
}

function defaultWindows(): WindowRow[] {
  return DAY_NAMES.map((_, i) => ({
    day_of_week: i,
    order_cutoff_time: '18:00',
    fulfillment_day_offset: 2,
    is_active: false,
  }))
}

export function OrderingWindowConfig() {
  const [windows, setWindows] = useState<WindowRow[]>(defaultWindows())
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await getOrderingWindows()
        if (saved.length > 0) {
          // Merge saved data into the 7-day grid
          const merged = defaultWindows()
          for (const s of saved) {
            if (s.day_of_week >= 0 && s.day_of_week <= 6) {
              merged[s.day_of_week] = {
                day_of_week: s.day_of_week,
                order_cutoff_time: s.order_cutoff_time,
                fulfillment_day_offset: s.fulfillment_day_offset,
                is_active: s.is_active,
              }
            }
          }
          setWindows(merged)
        }
        setLoaded(true)
      } catch (err) {
        toast.error('Failed to load ordering windows')
      }
    }
    load()
  }, [])

  const updateWindow = (dayIndex: number, updates: Partial<WindowRow>) => {
    setWindows((prev) =>
      prev.map((w, i) => (i === dayIndex ? { ...w, ...updates } : w))
    )
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        await saveOrderingWindows(windows)
        toast.success('Ordering windows saved')
      } catch (err) {
        toast.error('Failed to save ordering windows')
      }
    })
  }

  if (!loaded) {
    return <div className="p-4 text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ordering Windows</h2>
          <p className="text-sm text-gray-500">
            Set which days you accept orders, cutoff times, and fulfillment delays.
          </p>
        </div>
        <Button variant="primary" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="divide-y rounded-lg border">
        {windows.map((w, i) => (
          <div
            key={i}
            className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 p-3 ${
              !w.is_active ? 'opacity-50' : ''
            }`}
          >
            {/* Day name + toggle */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={w.is_active}
                onChange={(e) => updateWindow(i, { is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="font-medium">{DAY_NAMES[i]}</span>
            </label>

            {/* Cutoff time */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Cutoff:</label>
              <input
                type="time"
                value={w.order_cutoff_time}
                onChange={(e) => updateWindow(i, { order_cutoff_time: e.target.value })}
                className="rounded border px-2 py-1 text-sm"
                disabled={!w.is_active}
              />
            </div>

            {/* Fulfillment offset */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Fulfill in:</label>
              <select
                value={w.fulfillment_day_offset}
                onChange={(e) =>
                  updateWindow(i, { fulfillment_day_offset: parseInt(e.target.value, 10) })
                }
                className="rounded border px-2 py-1 text-sm"
                disabled={!w.is_active}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    {d} day{d > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Active indicator */}
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                w.is_active ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
