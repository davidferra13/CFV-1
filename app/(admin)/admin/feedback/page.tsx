// Admin Feedback Inbox
// All user-submitted feedback routed here. Chefs submit via Settings → Share Feedback.
// Clients submit via My Profile → Share Feedback.

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Feedback - Admin' }

const SENTIMENT_DISPLAY: Record<string, { emoji: string; label: string; color: string }> = {
  love: { emoji: '😍', label: 'Love it', color: 'bg-emerald-900 text-emerald-800' },
  frustrated: { emoji: '😤', label: 'Frustrated', color: 'bg-red-900 text-red-800' },
  suggestion: { emoji: '💡', label: 'Suggestion', color: 'bg-yellow-900 text-yellow-800' },
  bug: { emoji: '🐛', label: 'Bug', color: 'bg-orange-900 text-orange-800' },
  other: { emoji: '💬', label: 'Other', color: 'bg-slate-100 text-slate-700' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default async function AdminFeedbackPage() {
  await requireAdmin()

  const supabase = createAdminClient()
  const { data: rows, error } = await supabase
    .from('user_feedback')
    .select('id, created_at, sentiment, message, anonymous, user_role, page_context')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-6 text-red-600 text-sm">Failed to load feedback: {error.message}</div>
  }

  const feedback = rows ?? []

  const counts = feedback.reduce<Record<string, number>>((acc, row) => {
    acc[row.sentiment] = (acc[row.sentiment] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">User Feedback</h1>
        <p className="text-slate-400 text-sm mt-1">
          All feedback submitted by chefs and clients — newest first.
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SENTIMENT_DISPLAY).map(([key, { emoji, label, color }]) => (
          <span
            key={key}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}
          >
            {emoji} {label} — {counts[key] ?? 0}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-slate-700 text-slate-200">
          Total — {feedback.length}
        </span>
      </div>

      {feedback.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-8 text-center text-slate-400 text-sm">
          No feedback yet. Submissions from chefs and clients will appear here.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800 text-left">
                <th className="px-4 py-3 font-medium text-slate-300 w-40">Date</th>
                <th className="px-4 py-3 font-medium text-slate-300 w-36">Sentiment</th>
                <th className="px-4 py-3 font-medium text-slate-300">Message</th>
                <th className="px-4 py-3 font-medium text-slate-300 w-24">Who</th>
                <th className="px-4 py-3 font-medium text-slate-300 w-36">Page</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((row, i) => {
                const s = SENTIMENT_DISPLAY[row.sentiment] ?? SENTIMENT_DISPLAY.other
                const isLast = i === feedback.length - 1
                return (
                  <tr
                    key={row.id}
                    className={`${!isLast ? 'border-b border-slate-700/60' : ''} bg-slate-800/50 hover:bg-slate-700/40 transition-colors`}
                  >
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`}
                      >
                        {s.emoji} {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      <span title={row.message}>
                        {row.message.length > 140 ? row.message.slice(0, 140) + '…' : row.message}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {row.anonymous ? (
                        <span className="italic text-slate-500">Anonymous</span>
                      ) : (
                        <span className="capitalize">{row.user_role ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono truncate max-w-[140px]">
                      {row.page_context ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
