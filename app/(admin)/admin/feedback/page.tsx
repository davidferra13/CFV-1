// Admin Feedback & Issue Reports Inbox
// All user-submitted feedback and issue reports routed here.
// Issue reports are flagged with category, severity, and browser context.

import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/db/admin'
import type { Metadata } from 'next'
import { IssueReportDetail } from './_components/issue-report-detail'

export const metadata: Metadata = { title: 'Feedback & Reports - Admin' }

const SENTIMENT_DISPLAY: Record<string, { emoji: string; label: string; color: string }> = {
  love: { emoji: '😍', label: 'Love it', color: 'bg-emerald-900 text-emerald-800' },
  frustrated: { emoji: '😤', label: 'Frustrated', color: 'bg-red-900 text-red-800' },
  suggestion: { emoji: '💡', label: 'Suggestion', color: 'bg-yellow-900 text-yellow-800' },
  bug: { emoji: '🐛', label: 'Bug', color: 'bg-orange-900 text-orange-800' },
  other: { emoji: '💬', label: 'Other', color: 'bg-stone-800 text-stone-300' },
}

const REPORT_CATEGORY_DISPLAY: Record<
  string,
  { label: string; color: string; severity: 'low' | 'medium' | 'high' }
> = {
  bug: {
    label: 'Bug',
    color: 'bg-orange-900/60 text-orange-300 border-orange-700',
    severity: 'medium',
  },
  error_report: {
    label: 'Error',
    color: 'bg-red-900/60 text-red-300 border-red-700',
    severity: 'medium',
  },
  malicious_activity: {
    label: 'Malicious',
    color: 'bg-red-900/80 text-red-200 border-red-600',
    severity: 'high',
  },
  feature_not_working: {
    label: 'Feature Issue',
    color: 'bg-amber-900/60 text-amber-300 border-amber-700',
    severity: 'low',
  },
  security_concern: {
    label: 'Security',
    color: 'bg-red-900/80 text-red-200 border-red-600',
    severity: 'high',
  },
  other: { label: 'Other', color: 'bg-stone-800 text-stone-300 border-stone-600', severity: 'low' },
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

function isIssueReport(row: any): boolean {
  return row.metadata?.source === 'issue-report'
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()
  const params = await searchParams

  const db: any = createAdminClient()
  const { data: rows, error } = await db
    .from('user_feedback')
    .select('id, created_at, sentiment, message, anonymous, user_role, page_context, metadata')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-6 text-red-600 text-sm">Failed to load feedback: {error.message}</div>
  }

  const allRows = rows ?? []

  // Separate issue reports from regular feedback
  const issueReports = allRows.filter(isIssueReport)
  const regularFeedback = allRows.filter((r: any) => !isIssueReport(r))

  const filterParam = typeof params.filter === 'string' ? params.filter : undefined
  const activeFilter = filterParam ?? 'all'
  const filteredRows =
    activeFilter === 'reports'
      ? issueReports
      : activeFilter === 'feedback'
        ? regularFeedback
        : allRows

  // Count by sentiment
  const sentimentCounts = allRows.reduce((acc: any, row: any) => {
    acc[row.sentiment] = (acc[row.sentiment] ?? 0) + 1
    return acc
  }, {})

  // Count by report category
  const reportCategoryCounts = issueReports.reduce((acc: any, row: any) => {
    const cat = row.metadata?.report_category ?? 'other'
    acc[cat] = (acc[cat] ?? 0) + 1
    return acc
  }, {})

  // Critical reports (malicious + security) count
  const criticalCount =
    (reportCategoryCounts['malicious_activity'] ?? 0) +
    (reportCategoryCounts['security_concern'] ?? 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Feedback & Issue Reports</h1>
        <p className="text-slate-400 text-sm mt-1">
          All user-submitted feedback and issue reports, newest first.
        </p>
      </div>

      {/* Critical alert banner */}
      {criticalCount > 0 && (
        <div className="rounded-lg border border-red-700 bg-red-950/60 px-4 py-3 flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-900 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-red-300">
              {criticalCount} critical report{criticalCount !== 1 ? 's' : ''} require attention
            </p>
            <p className="text-xs text-red-400">
              Malicious activity or security concerns reported by users.
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-800/50 p-1 w-fit">
        {[
          { key: 'all', label: `All (${allRows.length})` },
          { key: 'reports', label: `Issue Reports (${issueReports.length})` },
          { key: 'feedback', label: `Feedback (${regularFeedback.length})` },
        ].map((tab) => (
          <a
            key={tab.key}
            href={`/admin/feedback${tab.key === 'all' ? '' : `?filter=${tab.key}`}`}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === tab.key
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {activeFilter !== 'reports' &&
          Object.entries(SENTIMENT_DISPLAY).map(([key, { emoji, label, color }]) => (
            <span
              key={key}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}
            >
              {emoji} {label} - {sentimentCounts[key] ?? 0}
            </span>
          ))}
        {activeFilter !== 'feedback' && issueReports.length > 0 && (
          <>
            {Object.entries(REPORT_CATEGORY_DISPLAY).map(([key, { label, color }]) =>
              (reportCategoryCounts[key] ?? 0) > 0 ? (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${color}`}
                >
                  {label} - {reportCategoryCounts[key]}
                </span>
              ) : null
            )}
          </>
        )}
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-8 text-center text-slate-400 text-sm">
          No{' '}
          {activeFilter === 'reports'
            ? 'issue reports'
            : activeFilter === 'feedback'
              ? 'feedback'
              : 'submissions'}{' '}
          yet.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRows.map((row: any) => {
            const isReport = isIssueReport(row)
            const s = SENTIMENT_DISPLAY[row.sentiment] ?? SENTIMENT_DISPLAY.other
            const reportCat = isReport
              ? (REPORT_CATEGORY_DISPLAY[row.metadata?.report_category] ??
                REPORT_CATEGORY_DISPLAY.other)
              : null
            const isCritical = reportCat?.severity === 'high'

            return (
              <div
                key={row.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isCritical
                    ? 'border-red-800 bg-red-950/30 hover:bg-red-950/50'
                    : isReport
                      ? 'border-amber-900/50 bg-slate-800/60 hover:bg-slate-800/80'
                      : 'border-slate-700/60 bg-slate-800/50 hover:bg-slate-700/40'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isReport && reportCat ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${reportCat.color}`}
                      >
                        {isCritical && (
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 9v2m0 4h.01"
                            />
                          </svg>
                        )}
                        {reportCat.label}
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.color}`}
                      >
                        {s.emoji} {s.label}
                      </span>
                    )}
                    {isReport && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-amber-600">
                        Issue Report
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {row.anonymous ? (
                        <em>Anonymous</em>
                      ) : (
                        <span className="capitalize">{row.user_role ?? 'user'}</span>
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
                    {formatDate(row.created_at)}
                  </span>
                </div>

                {/* Message */}
                <p className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">{row.message}</p>

                {/* Issue report details (error context, browser info) */}
                {isReport && <IssueReportDetail metadata={row.metadata} />}

                {/* Page context */}
                {row.page_context && (
                  <p className="mt-2 text-xs text-stone-500 font-mono">{row.page_context}</p>
                )}

                {/* Regular feedback metadata line */}
                {!isReport && row.metadata && typeof row.metadata === 'object' && (
                  <div className="mt-1.5 text-xs text-slate-500">
                    {[
                      typeof row.metadata['deviceType'] === 'string'
                        ? `device: ${row.metadata['deviceType']}`
                        : null,
                      typeof row.metadata['appVersion'] === 'string'
                        ? `version: ${row.metadata['appVersion']}`
                        : null,
                      typeof row.metadata['appEnv'] === 'string'
                        ? `env: ${row.metadata['appEnv']}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
