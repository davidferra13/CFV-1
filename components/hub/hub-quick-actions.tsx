'use client'

import { useState } from 'react'
import {
  postGuestCountUpdate,
  postDietaryUpdate,
  postRunningLate,
  postRepeatBookingRequest,
} from '@/lib/hub/client-quick-actions'

// ---------------------------------------------------------------------------
// Quick Action Chips
// Contextual action buttons below the message input in the Dinner Circle.
// Each chip opens a mini-form that posts a structured notification message.
// ---------------------------------------------------------------------------

interface QuickActionsProps {
  groupId: string
  profileToken: string | null
  eventId?: string | null
  eventStatus?: string | null
  eventDate?: string | null
}

type ActiveForm = 'guest_count' | 'dietary' | 'running_late' | 'repeat_booking' | null

export function HubQuickActions({
  groupId,
  profileToken,
  eventId,
  eventStatus,
  eventDate,
}: QuickActionsProps) {
  const [activeForm, setActiveForm] = useState<ActiveForm>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!profileToken) return null

  const isEventDay = eventDate
    ? new Date(eventDate).toDateString() === new Date().toDateString()
    : false
  const isEventPast = eventDate ? new Date(eventDate) < new Date() : false
  const isEventFuture = eventDate ? new Date(eventDate) >= new Date() : true

  // Determine available actions based on event status and date context
  const actions: { key: ActiveForm; label: string; icon: string }[] = []

  // Guest count and dietary: show before the event
  if ((eventStatus === 'confirmed' || eventStatus === 'paid') && isEventFuture) {
    actions.push({ key: 'guest_count', label: 'Update Guest Count', icon: '👥' })
    actions.push({ key: 'dietary', label: 'Dietary Update', icon: '🥗' })
  }

  // Running late: only on the day of the event
  if ((eventStatus === 'confirmed' || eventStatus === 'in_progress') && isEventDay) {
    actions.push({ key: 'running_late', label: 'Running Late', icon: '⏰' })
  }

  // Book again: after event is completed and in the past
  if (eventStatus === 'completed' && isEventPast) {
    actions.push({ key: 'repeat_booking', label: 'Book Again', icon: '🔄' })
  }

  // Fallback: show guest count and dietary if we don't know the status
  if (!eventStatus && eventId) {
    actions.push({ key: 'guest_count', label: 'Update Guest Count', icon: '👥' })
    actions.push({ key: 'dietary', label: 'Dietary Update', icon: '🥗' })
  }

  if (actions.length === 0) return null

  const handleSuccess = (msg: string) => {
    setSuccess(msg)
    setError(null)
    setActiveForm(null)
    setSubmitting(false)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleError = () => {
    setError('Something went wrong. Please try again.')
    setSubmitting(false)
    setTimeout(() => setError(null), 4000)
  }

  return (
    <div className="border-t border-stone-800 px-4 py-2">
      {/* Feedback */}
      {success && (
        <div className="mb-2 rounded-lg bg-green-900/30 px-3 py-1.5 text-xs text-green-300">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-2 rounded-lg bg-red-900/30 px-3 py-1.5 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Chips */}
      {!activeForm && (
        <div className="flex flex-wrap gap-1.5">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={() => setActiveForm(action.key)}
              className="flex items-center gap-1 rounded-full border border-stone-700 bg-stone-800/50 px-3 py-1 text-xs text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mini-forms */}
      {activeForm === 'guest_count' && eventId && (
        <GuestCountForm
          groupId={groupId}
          profileToken={profileToken}
          eventId={eventId}
          submitting={submitting}
          onSubmit={async (count, note) => {
            setSubmitting(true)
            try {
              await postGuestCountUpdate({ groupId, profileToken, eventId, newCount: count, note })
              handleSuccess('Guest count updated!')
            } catch {
              handleError()
            }
          }}
          onCancel={() => setActiveForm(null)}
        />
      )}

      {activeForm === 'dietary' && (
        <DietaryForm
          groupId={groupId}
          profileToken={profileToken}
          submitting={submitting}
          onSubmit={async (guestName, restrictions, allergies, note) => {
            setSubmitting(true)
            try {
              await postDietaryUpdate({
                groupId,
                profileToken,
                guestName,
                restrictions,
                allergies,
                note,
              })
              handleSuccess('Dietary update sent!')
            } catch {
              handleError()
            }
          }}
          onCancel={() => setActiveForm(null)}
        />
      )}

      {activeForm === 'running_late' && (
        <RunningLateForm
          groupId={groupId}
          profileToken={profileToken}
          submitting={submitting}
          onSubmit={async (etaMinutes, message) => {
            setSubmitting(true)
            try {
              await postRunningLate({ groupId, profileToken, etaMinutes, message })
              handleSuccess('Update sent!')
            } catch {
              handleError()
            }
          }}
          onCancel={() => setActiveForm(null)}
        />
      )}

      {activeForm === 'repeat_booking' && (
        <RepeatBookingForm
          groupId={groupId}
          profileToken={profileToken}
          submitting={submitting}
          onSubmit={async (preferredDate, sameMenu, guestCount, note) => {
            setSubmitting(true)
            try {
              await postRepeatBookingRequest({
                groupId,
                profileToken,
                preferredDate,
                sameMenu,
                guestCount,
                note,
              })
              handleSuccess('Booking request sent!')
            } catch {
              handleError()
            }
          }}
          onCancel={() => setActiveForm(null)}
        />
      )}
    </div>
  )
}

// ─── Mini-Form Components ────────────────────────────────────────────────────

function GuestCountForm({
  submitting,
  onSubmit,
  onCancel,
}: {
  groupId: string
  profileToken: string
  eventId: string
  submitting: boolean
  onSubmit: (count: number, note?: string) => void
  onCancel: () => void
}) {
  const [count, setCount] = useState('')
  const [note, setNote] = useState('')

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-stone-400">Update Guest Count</div>
      <input
        type="number"
        value={count}
        onChange={(e) => setCount(e.target.value)}
        placeholder="Number of guests"
        min={1}
        max={500}
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-600"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)"
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-600"
      />
      <div className="flex gap-2">
        <button
          onClick={() => count && onSubmit(parseInt(count), note || undefined)}
          disabled={!count || submitting}
          className="rounded-lg bg-[var(--hub-primary,#e88f47)] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Sending...' : 'Send Update'}
        </button>
        <button onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-300">
          Cancel
        </button>
      </div>
    </div>
  )
}

function DietaryForm({
  submitting,
  onSubmit,
  onCancel,
}: {
  groupId: string
  profileToken: string
  submitting: boolean
  onSubmit: (guestName: string, restrictions: string[], allergies: string[], note?: string) => void
  onCancel: () => void
}) {
  const [guestName, setGuestName] = useState('')
  const [restrictions, setRestrictions] = useState('')
  const [allergies, setAllergies] = useState('')
  const [note, setNote] = useState('')

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-stone-400">Dietary Update</div>
      <input
        type="text"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
        placeholder="Guest name"
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-600"
      />
      <input
        type="text"
        value={restrictions}
        onChange={(e) => setRestrictions(e.target.value)}
        placeholder="Dietary restrictions (comma-separated)"
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-600"
      />
      <input
        type="text"
        value={allergies}
        onChange={(e) => setAllergies(e.target.value)}
        placeholder="Allergies (comma-separated)"
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-600"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Additional notes (optional)"
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-600"
      />
      <div className="flex gap-2">
        <button
          onClick={() =>
            guestName &&
            onSubmit(
              guestName,
              restrictions
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              allergies
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              note || undefined
            )
          }
          disabled={!guestName || submitting}
          className="rounded-lg bg-[var(--hub-primary,#e88f47)] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Sending...' : 'Send Update'}
        </button>
        <button onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-300">
          Cancel
        </button>
      </div>
    </div>
  )
}

function RunningLateForm({
  submitting,
  onSubmit,
  onCancel,
}: {
  groupId: string
  profileToken: string
  submitting: boolean
  onSubmit: (etaMinutes: number, message?: string) => void
  onCancel: () => void
}) {
  const [eta, setEta] = useState<number | null>(null)
  const [message, setMessage] = useState('')

  const presets = [5, 15, 30]

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-stone-400">Running Late</div>
      <div className="flex gap-2">
        {presets.map((mins) => (
          <button
            key={mins}
            onClick={() => setEta(mins)}
            className={`rounded-lg border px-3 py-1 text-xs ${
              eta === mins
                ? 'border-yellow-600 bg-yellow-900/30 text-yellow-300'
                : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-600'
            }`}
          >
            {mins} min
          </button>
        ))}
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message (optional)"
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-600"
      />
      <div className="flex gap-2">
        <button
          onClick={() => eta && onSubmit(eta, message || undefined)}
          disabled={!eta || submitting}
          className="rounded-lg bg-yellow-700 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Sending...' : 'Notify'}
        </button>
        <button onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-300">
          Cancel
        </button>
      </div>
    </div>
  )
}

function RepeatBookingForm({
  submitting,
  onSubmit,
  onCancel,
}: {
  groupId: string
  profileToken: string
  submitting: boolean
  onSubmit: (preferredDate?: string, sameMenu?: boolean, guestCount?: number, note?: string) => void
  onCancel: () => void
}) {
  const [date, setDate] = useState('')
  const [sameMenu, setSameMenu] = useState(false)
  const [guestCount, setGuestCount] = useState('')
  const [note, setNote] = useState('')

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-stone-400">Book Again</div>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-200"
      />
      <input
        type="number"
        value={guestCount}
        onChange={(e) => setGuestCount(e.target.value)}
        placeholder="Number of guests"
        min={1}
        max={500}
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-600"
      />
      <label className="flex items-center gap-2 text-xs text-stone-300">
        <input
          type="checkbox"
          checked={sameMenu}
          onChange={(e) => setSameMenu(e.target.checked)}
          className="rounded border-stone-700"
        />
        Same menu as last time
      </label>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Any changes or requests?"
        className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-600"
      />
      <div className="flex gap-2">
        <button
          onClick={() =>
            onSubmit(
              date || undefined,
              sameMenu,
              guestCount ? parseInt(guestCount) : undefined,
              note || undefined
            )
          }
          disabled={submitting}
          className="rounded-lg bg-[var(--hub-primary,#e88f47)] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Sending...' : 'Request Booking'}
        </button>
        <button onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-300">
          Cancel
        </button>
      </div>
    </div>
  )
}
