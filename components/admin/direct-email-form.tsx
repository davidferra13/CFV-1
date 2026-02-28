'use client'

// Admin Direct Email Form — send a one-off email to any address

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { sendAdminDirectEmail } from '@/lib/admin/email-actions'

export function DirectEmailForm() {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setFeedback({ ok: false, msg: 'All fields are required.' })
      return
    }
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await sendAdminDirectEmail(to, subject, body)
        if (result.success) {
          setFeedback({ ok: true, msg: `Email sent to ${to}.` })
          setTo('')
          setSubject('')
          setBody('')
        } else {
          setFeedback({ ok: false, msg: result.error ?? 'Failed to send.' })
        }
      } catch (err) {
        toast.error('Failed to send email')
      }
    })
  }

  return (
    <div className="space-y-3">
      <input
        type="email"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="recipient@email.com"
        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
        disabled={isPending}
      />
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
        disabled={isPending}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message body…"
        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 resize-none"
        rows={5}
        disabled={isPending}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSend}
          disabled={isPending || !to || !subject || !body}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Sending…' : 'Send Email'}
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
