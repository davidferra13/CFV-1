'use client'

// SchedulingRulesForm — Chef availability rules editor.
// Blocked days, max events per week/month, buffer time, lead time.
// All fields are optional — rules only apply when configured.

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { upsertSchedulingRules, type SchedulingRules } from '@/lib/availability/rules-actions'

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type Props = {
  initialRules: SchedulingRules | null
}

export function SchedulingRulesForm({ initialRules }: Props) {
  const [blockedDays, setBlockedDays] = useState<number[]>(initialRules?.blocked_days_of_week ?? [])
  const [preferredDays, setPreferredDays] = useState<number[]>(
    initialRules?.preferred_days_of_week ?? []
  )
  const [maxPerWeek, setMaxPerWeek] = useState<string>(
    initialRules?.max_events_per_week?.toString() ?? ''
  )
  const [maxPerMonth, setMaxPerMonth] = useState<string>(
    initialRules?.max_events_per_month?.toString() ?? ''
  )
  const [bufferDays, setBufferDays] = useState<string>(
    initialRules?.min_buffer_days?.toString() ?? '0'
  )
  const [leadDays, setLeadDays] = useState<string>(initialRules?.min_lead_days?.toString() ?? '0')

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleDay(dow: number, set: number[], setter: (v: number[]) => void) {
    setter(set.includes(dow) ? set.filter((d) => d !== dow) : [...set, dow])
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await upsertSchedulingRules({
        blocked_days_of_week: blockedDays,
        preferred_days_of_week: preferredDays,
        max_events_per_week: maxPerWeek ? parseInt(maxPerWeek) : null,
        max_events_per_month: maxPerMonth ? parseInt(maxPerMonth) : null,
        min_buffer_days: parseInt(bufferDays) || 0,
        min_lead_days: parseInt(leadDays) || 0,
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error ?? 'Failed to save rules')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rules')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <div className="space-y-5">
      {/* Blocked days */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-2">
          Blocked days of week{' '}
          <span className="text-stone-400 font-normal">(hard block — cannot be overridden)</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {DOW_LABELS.map((label, dow) => {
            const blocked = blockedDays.includes(dow)
            return (
              <button
                key={dow}
                type="button"
                onClick={() => toggleDay(dow, blockedDays, setBlockedDays)}
                className={[
                  'px-3 py-1.5 rounded-full border text-sm font-medium transition-all',
                  blocked
                    ? 'bg-red-900 text-red-800 border-red-300'
                    : 'bg-stone-800 text-stone-500 border-stone-700 hover:bg-stone-700',
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </div>
        {blockedDays.length > 0 && (
          <p className="text-xs text-red-600 mt-1.5">
            New bookings will be blocked on: {blockedDays.map((d) => DOW_LABELS[d]).join(', ')}
          </p>
        )}
      </div>

      {/* Preferred days */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-2">
          Preferred days{' '}
          <span className="text-stone-400 font-normal">
            (advisory only — shows warning if chef books outside these)
          </span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {DOW_LABELS.map((label, dow) => {
            const preferred = preferredDays.includes(dow)
            return (
              <button
                key={dow}
                type="button"
                onClick={() => toggleDay(dow, preferredDays, setPreferredDays)}
                className={[
                  'px-3 py-1.5 rounded-full border text-sm font-medium transition-all',
                  preferred
                    ? 'bg-green-900 text-green-800 border-green-300'
                    : 'bg-stone-800 text-stone-500 border-stone-700 hover:bg-stone-700',
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Numeric rules */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Max events per week
          </label>
          <input
            type="number"
            min="1"
            max="20"
            placeholder="No limit"
            value={maxPerWeek}
            onChange={(e) => setMaxPerWeek(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Max events per month
          </label>
          <input
            type="number"
            min="1"
            max="50"
            placeholder="No limit"
            value={maxPerMonth}
            onChange={(e) => setMaxPerMonth(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Min buffer days between events
          </label>
          <input
            type="number"
            min="0"
            max="30"
            value={bufferDays}
            onChange={(e) => setBufferDays(e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-stone-400 mt-1">Days required between events</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Min lead days (advance notice)
          </label>
          <input
            type="number"
            min="0"
            max="90"
            value={leadDays}
            onChange={(e) => setLeadDays(e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-stone-400 mt-1">Min days ahead for new bookings</p>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Save failed">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" title="Rules saved">
          Your availability rules are updated.
        </Alert>
      )}

      <Button
        type="button"
        variant="primary"
        onClick={handleSave}
        loading={saving}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save Rules'}
      </Button>
    </div>
  )
}
