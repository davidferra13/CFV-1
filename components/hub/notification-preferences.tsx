'use client'

import { useState, useTransition } from 'react'

interface NotificationPreferencesProps {
  groupId: string
  profileToken: string
  initialPrefs: {
    notifications_muted: boolean
    notify_email: boolean
    notify_push: boolean
    quiet_hours_start: string | null
    quiet_hours_end: string | null
    digest_mode: string
  }
  onSave: (prefs: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
}

const DIGEST_OPTIONS = [
  { value: 'instant', label: 'Instant', desc: 'Get notified right away' },
  { value: 'hourly', label: 'Hourly digest', desc: 'Batched every hour' },
  { value: 'daily', label: 'Daily digest', desc: 'One summary per day' },
]

export function NotificationPreferences({ initialPrefs, onSave }: NotificationPreferencesProps) {
  const [muted, setMuted] = useState(initialPrefs.notifications_muted)
  const [email, setEmail] = useState(initialPrefs.notify_email)
  const [push, setPush] = useState(initialPrefs.notify_push)
  const [quietStart, setQuietStart] = useState(initialPrefs.quiet_hours_start ?? '')
  const [quietEnd, setQuietEnd] = useState(initialPrefs.quiet_hours_end ?? '')
  const [digest, setDigest] = useState(initialPrefs.digest_mode ?? 'instant')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await onSave({
          notifications_muted: muted,
          notify_email: email,
          notify_push: push,
          quiet_hours_start: quietStart || null,
          quiet_hours_end: quietEnd || null,
          digest_mode: digest,
        })
        if (result.success) {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        } else {
          setError(result.error ?? 'Failed to save')
        }
      } catch {
        setError('Failed to save preferences')
      }
    })
  }

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-stone-300">Notification Preferences</h4>

      {/* Master mute */}
      <label className="flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-200">Mute all notifications</p>
          <p className="text-[10px] text-stone-500">No notifications from this circle</p>
        </div>
        <button
          type="button"
          onClick={() => setMuted(!muted)}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            muted ? 'bg-[var(--hub-primary,#e88f47)]' : 'bg-stone-700'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              muted ? 'left-[18px]' : 'left-0.5'
            }`}
          />
        </button>
      </label>

      {!muted && (
        <>
          {/* Email notifications */}
          <label className="flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-200">Email notifications</p>
              <p className="text-[10px] text-stone-500">Receive email for new messages</p>
            </div>
            <button
              type="button"
              onClick={() => setEmail(!email)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                email ? 'bg-[var(--hub-primary,#e88f47)]' : 'bg-stone-700'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  email ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
          </label>

          {/* Push notifications */}
          <label className="flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-200">Push notifications</p>
              <p className="text-[10px] text-stone-500">Browser push alerts</p>
            </div>
            <button
              type="button"
              onClick={() => setPush(!push)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                push ? 'bg-[var(--hub-primary,#e88f47)]' : 'bg-stone-700'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  push ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
          </label>

          {/* Digest mode */}
          <div>
            <p className="mb-1.5 text-xs text-stone-200">Delivery frequency</p>
            <div className="space-y-1">
              {DIGEST_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                    digest === opt.value
                      ? 'border-[var(--hub-primary,#e88f47)]/40 bg-stone-800'
                      : 'border-stone-800 bg-stone-900/40 hover:bg-stone-800/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="digest"
                    value={opt.value}
                    checked={digest === opt.value}
                    onChange={() => setDigest(opt.value)}
                    className="accent-[var(--hub-primary,#e88f47)]"
                  />
                  <div>
                    <p className="text-xs text-stone-200">{opt.label}</p>
                    <p className="text-[10px] text-stone-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Quiet hours */}
          <div>
            <p className="mb-1.5 text-xs text-stone-200">Quiet hours</p>
            <p className="mb-1 text-[10px] text-stone-500">No notifications during these hours</p>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                className="rounded bg-stone-700 px-2 py-1 text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
              />
              <span className="text-xs text-stone-500">to</span>
              <input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                className="rounded bg-stone-700 px-2 py-1 text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
              />
              {(quietStart || quietEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    setQuietStart('')
                    setQuietEnd('')
                  }}
                  className="text-[10px] text-stone-500 hover:text-stone-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {error && <p className="text-[10px] text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="w-full rounded-lg bg-[var(--hub-primary,#e88f47)] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Saving...' : saved ? '✓ Saved' : 'Save Preferences'}
      </button>
    </div>
  )
}
