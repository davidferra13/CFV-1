'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createQuickRequest } from '@/lib/client-requests/actions'
import { Send } from 'lucide-react'

const TIME_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'morning', label: 'Morning' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'custom', label: 'Specific time...' },
]

interface QuickRequestFormProps {
  lastMenu?: { id: string; name: string } | null
  defaultGuestCount?: number
}

export function QuickRequestForm({ lastMenu, defaultGuestCount }: QuickRequestFormProps) {
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState('')
  const [timePreference, setTimePreference] = useState('')
  const [customTime, setCustomTime] = useState('')
  const [guestCount, setGuestCount] = useState(defaultGuestCount ?? 2)
  const [repeatMenu, setRepeatMenu] = useState(false)
  const [notes, setNotes] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!date) {
      setError('Please select a date.')
      return
    }

    const resolvedTime = timePreference === 'custom' ? customTime : timePreference

    startTransition(async () => {
      try {
        await createQuickRequest({
          requestedDate: date,
          requestedTime: resolvedTime || null,
          guestCount,
          notes: notes.trim() || null,
          preferredMenuId: repeatMenu && lastMenu ? lastMenu.id : null,
        })
        setSuccess(true)
        // Reset form
        setDate('')
        setTimePreference('')
        setCustomTime('')
        setGuestCount(defaultGuestCount ?? 2)
        setRepeatMenu(false)
        setNotes('')
      } catch (err: any) {
        setError(err.message || 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Quick Request
        </CardTitle>
        <p className="text-sm text-stone-600 mt-1">
          Need your chef again? Pick a date, set the guest count, and send.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div>
            <label htmlFor="qr-date" className="block text-sm font-medium text-stone-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              id="qr-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
          </div>

          {/* Time preference */}
          <div>
            <label htmlFor="qr-time" className="block text-sm font-medium text-stone-700 mb-1">
              Time Preference
            </label>
            <select
              id="qr-time"
              value={timePreference}
              onChange={(e) => setTimePreference(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {timePreference === 'custom' && (
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            )}
          </div>

          {/* Guest count */}
          <div>
            <label htmlFor="qr-guests" className="block text-sm font-medium text-stone-700 mb-1">
              Guest Count
            </label>
            <input
              id="qr-guests"
              type="number"
              min={1}
              max={200}
              value={guestCount}
              onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          {/* Repeat last menu toggle */}
          {lastMenu && (
            <div className="flex items-center gap-3">
              <input
                id="qr-repeat-menu"
                type="checkbox"
                checked={repeatMenu}
                onChange={(e) => setRepeatMenu(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="qr-repeat-menu" className="text-sm text-stone-700">
                Repeat last menu: <span className="font-medium">{lastMenu.name}</span>
              </label>
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="qr-notes" className="block text-sm font-medium text-stone-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="qr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Same as last time, no shellfish this time, etc."
              rows={3}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
            />
          </div>

          {/* Error/success */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              Request sent! Your chef will get back to you shortly.
            </div>
          )}

          {/* Submit */}
          <Button type="submit" variant="primary" disabled={isPending} className="w-full">
            {isPending ? 'Sending...' : 'Send Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
