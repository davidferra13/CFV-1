'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createRecurringService, logServedDish } from '@/lib/recurring/actions'
import { SERVICE_TYPE_LABELS, REACTION_LABELS } from '@/lib/recurring/constants'

const SERVICE_TYPES = Object.entries(SERVICE_TYPE_LABELS)
const REACTIONS = Object.entries(REACTION_LABELS)
const WEEK_DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

export function RecurringServiceForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [showService, setShowService] = useState(false)
  const [showDish, setShowDish] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [svcForm, setSvcForm] = useState({
    service_type: 'weekly_meal_prep',
    frequency: 'weekly',
    day_of_week: [] as number[],
    rate_dollars: '',
    start_date: '',
    end_date: '',
    typical_guest_count: '',
    notes: '',
  })

  const [dishForm, setDishForm] = useState({
    dish_name: '',
    served_date: new Date().toISOString().slice(0, 10),
    client_reaction: '',
    notes: '',
  })

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const parsedRate = parseFloat(svcForm.rate_dollars)
      if (!Number.isFinite(parsedRate) || parsedRate < 0) {
        throw new Error('Please enter a valid non-negative rate.')
      }

      await createRecurringService({
        client_id: clientId,
        service_type: svcForm.service_type as
          | 'weekly_meal_prep'
          | 'weekly_dinners'
          | 'daily_meals'
          | 'biweekly_prep'
          | 'other',
        frequency: svcForm.frequency as 'weekly' | 'biweekly' | 'monthly',
        day_of_week: svcForm.day_of_week.length > 0 ? svcForm.day_of_week : undefined,
        rate_cents: Math.round(parsedRate * 100),
        start_date: svcForm.start_date,
        end_date: svcForm.end_date || undefined,
        typical_guest_count: svcForm.typical_guest_count
          ? parseInt(svcForm.typical_guest_count)
          : undefined,
        notes: svcForm.notes || undefined,
        status: 'active' as const,
      })
      setSvcForm({
        service_type: 'weekly_meal_prep',
        frequency: 'weekly',
        day_of_week: [],
        rate_dollars: '',
        start_date: '',
        end_date: '',
        typical_guest_count: '',
        notes: '',
      })
      setShowService(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogDish(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await logServedDish({
        client_id: clientId,
        dish_name: dishForm.dish_name,
        served_date: dishForm.served_date,
        client_reaction:
          (dishForm.client_reaction as 'loved' | 'liked' | 'neutral' | 'disliked' | undefined) ||
          undefined,
        notes: dishForm.notes || undefined,
      })
      setDishForm({
        dish_name: '',
        served_date: new Date().toISOString().slice(0, 10),
        client_reaction: '',
        notes: '',
      })
      setShowDish(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setShowService(true)
            setShowDish(false)
          }}
        >
          + Set Up Service
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setShowDish(true)
            setShowService(false)
          }}
        >
          + Log Dish Served
        </Button>
      </div>

      {showService && (
        <div className="border border-stone-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-100">New Recurring Service</h3>
          <form onSubmit={handleAddService} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Type</label>
                <select
                  className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                  value={svcForm.service_type}
                  onChange={(e) => setSvcForm((p) => ({ ...p, service_type: e.target.value }))}
                >
                  {SERVICE_TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Frequency</label>
                <select
                  className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                  value={svcForm.frequency}
                  onChange={(e) => setSvcForm((p) => ({ ...p, frequency: e.target.value }))}
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Rate per session *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={svcForm.rate_dollars}
                  onChange={(e) => setSvcForm((p) => ({ ...p, rate_dollars: e.target.value }))}
                  placeholder="500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Start date *
                </label>
                <Input
                  type="date"
                  value={svcForm.start_date}
                  onChange={(e) => setSvcForm((p) => ({ ...p, start_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">End date</label>
                <Input
                  type="date"
                  value={svcForm.end_date}
                  min={svcForm.start_date || undefined}
                  onChange={(e) => setSvcForm((p) => ({ ...p, end_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Typical guests
                </label>
                <Input
                  type="number"
                  min="1"
                  value={svcForm.typical_guest_count}
                  onChange={(e) =>
                    setSvcForm((p) => ({ ...p, typical_guest_count: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Service days
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => {
                    const selected = svcForm.day_of_week.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        className={`rounded-md border px-2 py-1 text-xs transition ${
                          selected
                            ? 'border-brand-500 bg-brand-500/20 text-brand-200'
                            : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-500'
                        }`}
                        onClick={() =>
                          setSvcForm((prev) => ({
                            ...prev,
                            day_of_week: selected
                              ? prev.day_of_week.filter((value) => value !== day.value)
                              : [...prev.day_of_week, day.value].sort((a, b) => a - b),
                          }))
                        }
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  Leave blank to use the same weekday as the start date.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Notes</label>
                <Input
                  value={svcForm.notes}
                  onChange={(e) => setSvcForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Saving…' : 'Set Up Service'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowService(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {showDish && (
        <div className="border border-stone-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-100">Log Dish Served</h3>
          <form onSubmit={handleLogDish} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-400 mb-1">Dish name *</label>
                <Input
                  value={dishForm.dish_name}
                  onChange={(e) => setDishForm((p) => ({ ...p, dish_name: e.target.value }))}
                  placeholder="Seared duck breast, risotto…"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Date served *
                </label>
                <Input
                  type="date"
                  value={dishForm.served_date}
                  onChange={(e) => setDishForm((p) => ({ ...p, served_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Client reaction
                </label>
                <select
                  className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
                  value={dishForm.client_reaction}
                  onChange={(e) => setDishForm((p) => ({ ...p, client_reaction: e.target.value }))}
                >
                  <option value="">Not recorded</option>
                  {REACTIONS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-400 mb-1">Notes</label>
                <Input
                  value={dishForm.notes}
                  onChange={(e) => setDishForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Saving…' : 'Log Dish'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowDish(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
