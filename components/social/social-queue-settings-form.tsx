'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { generateAnnualSocialPlan, upsertSocialQueueSettings } from '@/lib/social/actions'
import type { SocialQueueSettings } from '@/lib/social/types'
import { Plus, Trash2, AlertCircle } from 'lucide-react'

const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

type QueueSlot = { day: number; time: string }

function buildSlots(days: number[], times: string[]): QueueSlot[] {
  const len = Math.max(days.length, times.length)
  return Array.from({ length: len }, (_, i) => ({
    day: days[i] ?? 1,
    time: times[i] ?? '09:00',
  }))
}

type Props = {
  settings: SocialQueueSettings
  postCount: number
}

export function SocialQueueSettingsForm({ settings, postCount }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  const [targetYear, setTargetYear] = useState(settings.target_year)
  const [postsPerWeek, setPostsPerWeek] = useState(settings.posts_per_week)
  const [timezone, setTimezone] = useState(settings.timezone)
  const [slots, setSlots] = useState<QueueSlot[]>(
    buildSlots(settings.queue_days, settings.queue_times)
  )
  const [holdoutSlots, setHoldoutSlots] = useState(settings.holdout_slots_per_month)

  const estimatedTotal = postsPerWeek * 52 - holdoutSlots * 12

  function addSlot() {
    setSlots((prev) => [...prev, { day: 1, time: '09:00' }])
  }

  function removeSlot(i: number) {
    setSlots((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateSlot(i: number, field: keyof QueueSlot, value: string | number) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  function handleSave(andGenerate = false) {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      try {
        const payload = {
          target_year: targetYear,
          posts_per_week: postsPerWeek,
          timezone,
          queue_days: slots.map((s) => s.day),
          queue_times: slots.map((s) => s.time),
          holdout_slots_per_month: holdoutSlots,
        }
        await upsertSocialQueueSettings(payload)
        if (andGenerate) {
          await generateAnnualSocialPlan({ ...payload, force_regenerate: false })
        }
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        setConfirmRegenerate(false)
        router.refresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Save failed.')
      }
    })
  }

  function handleForceRegenerate() {
    setError(null)
    startTransition(async () => {
      try {
        const payload = {
          target_year: targetYear,
          posts_per_week: postsPerWeek,
          timezone,
          queue_days: slots.map((s) => s.day),
          queue_times: slots.map((s) => s.time),
          holdout_slots_per_month: holdoutSlots,
        }
        await upsertSocialQueueSettings(payload)
        await generateAnnualSocialPlan({ ...payload, force_regenerate: true })
        setConfirmRegenerate(false)
        router.refresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Regeneration failed.')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Target Year */}
      <div>
        <label htmlFor="target-year" className="block text-sm font-medium text-stone-700 mb-1.5">
          Target Year
        </label>
        <select
          id="target-year"
          value={targetYear}
          onChange={(e) => setTargetYear(Number(e.target.value))}
          className="w-40 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
        >
          {[2025, 2026, 2027, 2028].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Posts Per Week */}
      <div>
        <label htmlFor="posts-per-week" className="block text-sm font-medium text-stone-700 mb-1.5">
          Posts Per Week
          <span className="ml-2 font-normal text-stone-400">
            ({postsPerWeek}/week = ~{postsPerWeek * 52} posts/year)
          </span>
        </label>
        <div className="flex items-center gap-4">
          <input
            id="posts-per-week"
            type="range"
            min={1}
            max={14}
            value={postsPerWeek}
            onChange={(e) => setPostsPerWeek(Number(e.target.value))}
            className="w-48"
          />
          <span className="text-2xl font-bold text-stone-800 w-8">{postsPerWeek}</span>
        </div>
        <div className="flex gap-2 mt-2">
          {[3, 5, 7, 14].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPostsPerWeek(n)}
              className={[
                'px-3 py-1 text-xs rounded-full border transition-colors',
                postsPerWeek === n
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'border-stone-200 text-stone-500 hover:border-stone-300',
              ].join(' ')}
            >
              {n}×/week
            </button>
          ))}
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-stone-700 mb-1.5">
          Timezone
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-72 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      {/* Queue Day/Time Slots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="text-sm font-medium text-stone-700">Posting Schedule</label>
            <p className="text-xs text-stone-400 mt-0.5">
              Which days and times to post each week. Add one slot per scheduled post.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={addSlot}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Slot
          </Button>
        </div>
        <div className="space-y-2">
          {slots.map((slot, i) => (
            <div key={i} className="flex items-center gap-3">
              <select
                value={slot.day}
                onChange={(e) => updateSlot(i, 'day', Number(e.target.value))}
                aria-label={`Day for slot ${i + 1}`}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {DAY_LABELS.slice(1).map((label, di) => (
                  <option key={di + 1} value={di + 1}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={slot.time}
                onChange={(e) => updateSlot(i, 'time', e.target.value)}
                aria-label={`Time for slot ${i + 1}`}
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <button
                type="button"
                aria-label={`Remove slot ${i + 1}`}
                onClick={() => removeSlot(i)}
                className="text-stone-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {slots.length === 0 && (
            <p className="text-sm text-stone-400 italic">No slots configured — add at least one.</p>
          )}
        </div>
      </div>

      {/* Reserved slots */}
      <div>
        <label htmlFor="holdout-slots" className="block text-sm font-medium text-stone-700 mb-1.5">
          Reserved Slots Per Month
          <span className="ml-2 font-normal text-stone-400">(kept empty for timely content)</span>
        </label>
        <div className="flex items-center gap-4">
          <input
            id="holdout-slots"
            type="range"
            min={0}
            max={10}
            value={holdoutSlots}
            onChange={(e) => setHoldoutSlots(Number(e.target.value))}
            className="w-48"
          />
          <span className="text-2xl font-bold text-stone-800 w-8">{holdoutSlots}</span>
        </div>
      </div>

      {/* Estimate */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 px-5 py-4">
        <p className="text-sm text-stone-600">
          Your schedule will generate approximately{' '}
          <span className="font-bold text-stone-900">{estimatedTotal}</span> posts for {targetYear}.
          {estimatedTotal >= 250 && (
            <span className="text-emerald-600 ml-1">
              That&apos;s {Math.round((estimatedTotal / 52) * 10) / 10} posts/week — a full content
              planner on autopilot.
            </span>
          )}
        </p>
        {postCount > 0 && (
          <p className="text-xs text-stone-400 mt-1">
            You currently have <strong>{postCount}</strong> posts generated for{' '}
            {settings.target_year}.
          </p>
        )}
      </div>

      {/* Error / success */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
          Settings saved successfully.
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => handleSave(false)} loading={isPending}>
          Save Settings
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleSave(true)}
          loading={isPending}
          disabled={postCount > 0}
        >
          Save &amp; Generate Plan
        </Button>
        {postCount > 0 && (
          <Button variant="danger" onClick={() => setConfirmRegenerate(true)} loading={isPending}>
            Regenerate (Replace All)
          </Button>
        )}
      </div>

      {/* Regenerate confirm dialog */}
      {confirmRegenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setConfirmRegenerate(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-700">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-semibold text-stone-900">Replace all posts?</h3>
            </div>
            <p className="text-sm text-stone-600">
              This will delete all <strong>{postCount}</strong> existing posts for{' '}
              {settings.target_year} and generate a fresh set. Any content you&apos;ve written will
              be permanently lost.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setConfirmRegenerate(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleForceRegenerate}
                loading={isPending}
                className="flex-1"
              >
                Yes, Replace All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
