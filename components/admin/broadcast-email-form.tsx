'use client'

// Admin Broadcast Email Form — send an email to all chefs or inactive chefs

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { sendAdminBroadcastEmail } from '@/lib/admin/email-actions'

export function BroadcastEmailForm() {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleBroadcast(target: 'all_chefs' | 'inactive_chefs') {
    if (!subject.trim() || !body.trim()) {
      setFeedback({ ok: false, msg: 'Subject and body are required.' })
      return
    }
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await sendAdminBroadcastEmail(target, subject, body)
        if (result.success) {
          setFeedback({
            ok: true,
            msg: `Sent to ${result.sentCount} recipient${result.sentCount !== 1 ? 's' : ''}.`,
          })
          setSubject('')
          setBody('')
        } else {
          setFeedback({ ok: false, msg: result.error ?? 'Failed to send.' })
        }
      } catch (err) {
        toast.error('Failed to send broadcast email')
      }
    })
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
        disabled={isPending}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message body…"
        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
        rows={5}
        disabled={isPending}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => handleBroadcast('all_chefs')}
          disabled={isPending || !subject || !body}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Sending…' : 'Email All Chefs'}
        </button>
        <button
          onClick={() => handleBroadcast('inactive_chefs')}
          disabled={isPending || !subject || !body}
          className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Sending…' : 'Email Inactive Chefs (60+ days)'}
        </button>
        {feedback && (
          <span className={`text-xs ${feedback.ok ? 'text-green-600' : 'text-red-600'}`}>
            {feedback.msg}
          </span>
        )}
      </div>
    </div>
  )
}
