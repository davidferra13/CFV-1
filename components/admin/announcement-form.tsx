'use client'

// Admin Announcement Form — set or clear the platform-wide banner
// Calls setAnnouncement / clearAnnouncement server actions.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  setAnnouncement,
  clearAnnouncement,
  type AnnouncementType,
} from '@/lib/admin/platform-actions'

type Props = {
  currentText: string
  currentType: AnnouncementType
}

const TYPE_OPTIONS: { value: AnnouncementType; label: string; color: string }[] = [
  { value: 'info', label: 'Info (blue)', color: 'bg-blue-900 text-blue-200' },
  { value: 'warning', label: 'Warning (amber)', color: 'bg-amber-900 text-amber-200' },
  { value: 'critical', label: 'Critical (red)', color: 'bg-red-900 text-red-200' },
]

export function AnnouncementForm({ currentText, currentType }: Props) {
  const [text, setText] = useState(currentText)
  const [type, setType] = useState<AnnouncementType>(currentType)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSet() {
    startTransition(async () => {
      try {
        const result = await setAnnouncement(text, type)
        setFeedback(
          result.success
            ? { ok: true, msg: text.trim() ? 'Announcement set.' : 'Announcement cleared.' }
            : { ok: false, msg: result.error ?? 'Failed.' }
        )
      } catch (err) {
        toast.error('Failed to set announcement')
      }
    })
  }

  function handleClear() {
    const previousText = text
    startTransition(async () => {
      try {
        const result = await clearAnnouncement()
        if (result.success) {
          setText('')
          setFeedback({ ok: true, msg: 'Announcement cleared.' })
        } else {
          setFeedback({ ok: false, msg: result.error ?? 'Failed.' })
        }
      } catch (err) {
        setText(previousText) // rollback
        toast.error('Failed to clear announcement')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setType(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border-2 transition-colors ${
              type === opt.value
                ? 'border-slate-400 ' + opt.color
                : 'border-transparent bg-stone-800 text-stone-500 hover:bg-stone-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter announcement text… (e.g. 'ChefFlow will be down for maintenance on Sunday 2am–4am ET')"
        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
        rows={3}
        disabled={isPending}
      />

      {/* Live preview */}
      {text.trim() && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            type === 'info'
              ? 'bg-blue-950 text-blue-200 border border-blue-200'
              : type === 'warning'
                ? 'bg-amber-950 text-amber-200 border border-amber-200'
                : 'bg-red-950 text-red-200 border border-red-200'
          }`}
        >
          <span className="font-semibold mr-1">Preview:</span> {text}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSet}
          disabled={isPending}
          className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving…' : 'Set Announcement'}
        </button>
        {currentText && (
          <button
            onClick={handleClear}
            disabled={isPending}
            className="px-4 py-2 bg-stone-800 text-stone-400 text-sm font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors"
          >
            Clear
          </button>
        )}
        {feedback && (
          <span className={`text-xs ${feedback.ok ? 'text-green-600' : 'text-red-600'}`}>
            {feedback.msg}
          </span>
        )}
      </div>
    </div>
  )
}
