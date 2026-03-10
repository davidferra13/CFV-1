'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { updateSchedulingRules, type SchedulingRules } from '@/lib/calendar/buffer-rules'
import { toast } from 'sonner'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const BUFFER_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hr' },
  { value: 90, label: '1.5 hr' },
  { value: 120, label: '2 hr' },
]

type SchedulingRulesFormProps = {
  initialRules: SchedulingRules
}

export function SchedulingRulesForm({ initialRules }: SchedulingRulesFormProps) {
  const [rules, setRules] = useState<SchedulingRules>(initialRules)
  const [isPending, startTransition] = useTransition()

  function toggleBlockedDay(day: number) {
    setRules((prev) => ({
      ...prev,
      blocked_days_of_week: prev.blocked_days_of_week.includes(day)
        ? prev.blocked_days_of_week.filter((d) => d !== day)
        : [...prev.blocked_days_of_week, day],
    }))
  }

  function togglePreferredDay(day: number) {
    setRules((prev) => ({
      ...prev,
      preferred_days_of_week: prev.preferred_days_of_week.includes(day)
        ? prev.preferred_days_of_week.filter((d) => d !== day)
        : [...prev.preferred_days_of_week, day],
    }))
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const result = await updateSchedulingRules(rules)
        if (result.success) {
          toast.success('Scheduling rules saved')
        } else {
          toast.error(result.error ?? 'Failed to save scheduling rules')
        }
      } catch (err) {
        toast.error('Failed to save scheduling rules')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Buffer Times */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buffer Times</CardTitle>
          <p className="text-sm text-stone-400">
            Add breathing room before and after each event for setup, cleanup, and travel.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Buffer before events
              </label>
              <select
                value={rules.default_buffer_before_minutes}
                onChange={(e) =>
                  setRules((prev) => ({
                    ...prev,
                    default_buffer_before_minutes: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
              >
                {BUFFER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Buffer after events
              </label>
              <select
                value={rules.default_buffer_after_minutes}
                onChange={(e) =>
                  setRules((prev) => ({
                    ...prev,
                    default_buffer_after_minutes: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
              >
                {BUFFER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">
              Minimum buffer days between events
            </label>
            <select
              value={rules.min_buffer_days}
              onChange={(e) =>
                setRules((prev) => ({ ...prev, min_buffer_days: Number(e.target.value) }))
              }
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
            >
              <option value={0}>None (same-day OK)</option>
              <option value={1}>1 day</option>
              <option value={2}>2 days</option>
              <option value={3}>3 days</option>
              <option value={5}>5 days</option>
              <option value={7}>1 week</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Booking Caps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking Caps</CardTitle>
          <p className="text-sm text-stone-400">
            Limit how many events can be booked per day, week, or month to avoid burnout.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Max events per day
              </label>
              <select
                value={rules.max_per_day}
                onChange={(e) =>
                  setRules((prev) => ({ ...prev, max_per_day: Number(e.target.value) }))
                }
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Max events per week
              </label>
              <select
                value={rules.max_per_week}
                onChange={(e) =>
                  setRules((prev) => ({ ...prev, max_per_week: Number(e.target.value) }))
                }
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Max events per month
              </label>
              <select
                value={rules.max_events_per_month ?? 0}
                onChange={(e) =>
                  setRules((prev) => ({
                    ...prev,
                    max_events_per_month: Number(e.target.value) || null,
                  }))
                }
                className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
              >
                <option value={0}>No limit</option>
                {[5, 10, 15, 20, 25, 30, 40, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocked Days */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Blocked Days</CardTitle>
          <p className="text-sm text-stone-400">
            Days you never accept events. Bookings on these days will be automatically blocked.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DAY_NAMES.map((name, idx) => {
              const isBlocked = rules.blocked_days_of_week.includes(idx)
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleBlockedDay(idx)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    isBlocked
                      ? 'border-red-700 bg-red-950/40 text-red-300'
                      : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-500'
                  }`}
                >
                  {DAY_SHORT[idx]}
                  {isBlocked && (
                    <Badge variant="error" className="ml-1.5 text-[10px]">
                      Off
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preferred Days */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferred Days</CardTitle>
          <p className="text-sm text-stone-400">
            Days you prefer to work. Used as a soft preference when displaying availability (not
            enforced).
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DAY_NAMES.map((name, idx) => {
              const isPreferred = rules.preferred_days_of_week.includes(idx)
              const isBlocked = rules.blocked_days_of_week.includes(idx)
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => !isBlocked && togglePreferredDay(idx)}
                  disabled={isBlocked}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    isBlocked
                      ? 'border-stone-800 bg-stone-900/50 text-stone-600 cursor-not-allowed'
                      : isPreferred
                        ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300'
                        : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-500'
                  }`}
                >
                  {DAY_SHORT[idx]}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lead Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Minimum Lead Time</CardTitle>
          <p className="text-sm text-stone-400">
            How far in advance clients must book. Events within this window will be flagged.
          </p>
        </CardHeader>
        <CardContent>
          <select
            value={rules.min_lead_days}
            onChange={(e) =>
              setRules((prev) => ({ ...prev, min_lead_days: Number(e.target.value) }))
            }
            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
          >
            <option value={0}>No minimum</option>
            <option value={1}>1 day</option>
            <option value={2}>2 days</option>
            <option value={3}>3 days</option>
            <option value={5}>5 days</option>
            <option value={7}>1 week</option>
            <option value={14}>2 weeks</option>
            <option value={21}>3 weeks</option>
            <option value={30}>1 month</option>
            <option value={60}>2 months</option>
            <option value={90}>3 months</option>
          </select>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Scheduling Rules'}
        </Button>
      </div>
    </div>
  )
}
