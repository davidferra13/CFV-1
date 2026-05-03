// Expandable detail panel for issue reports in the admin feedback inbox.
// Shows error context, browser info, and captured metadata.

'use client'

import { useState } from 'react'

type Props = {
  metadata: Record<string, any>
}

export function IssueReportDetail({ metadata }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!metadata) return null

  const errorMessage = metadata.errorMessage as string | undefined
  const errorDigest = metadata.errorDigest as string | undefined
  const boundary = metadata.boundary as string | undefined
  const viewport = metadata.viewport as string | undefined
  const userAgent = metadata.userAgent as string | undefined
  const timezone = metadata.timezone as string | undefined
  const online = metadata.online as string | undefined
  const fullUrl = metadata.fullUrl as string | undefined
  const reportedAt = metadata.reportedAt as string | undefined

  const breadcrumbSessionId = metadata.breadcrumbSessionId as string | undefined
  const navigationHistory = metadata.navigationHistory as string | undefined
  const historyLength = metadata.historyLength as string | undefined

  let navEntries: Array<{ path: string; timestamp?: string }> = []
  if (navigationHistory) {
    try {
      navEntries = JSON.parse(navigationHistory).filter(
        (e: any) => e.path && !e.path.startsWith('__session:')
      )
    } catch {
      /* ignore parse errors */
    }
  }

  const hasErrorContext = errorMessage || errorDigest
  const hasBrowserContext = viewport || userAgent || timezone
  const hasNavContext = breadcrumbSessionId || navEntries.length > 0

  if (!hasErrorContext && !hasBrowserContext && !hasNavContext) return null

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {expanded ? 'Hide' : 'Show'} details
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {/* Error context */}
          {hasErrorContext && (
            <div className="rounded-md border border-red-900/50 bg-red-950/20 p-3 space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-red-500">
                Captured Error
              </p>
              {errorMessage && (
                <p className="text-xs text-red-300 font-mono break-all">{errorMessage}</p>
              )}
              {errorDigest && <p className="text-xs text-red-500">Error ID: {errorDigest}</p>}
              {boundary && <p className="text-xs text-red-500">Boundary: {boundary}</p>}
            </div>
          )}

          {/* Navigation trail */}
          {hasNavContext && (
            <div className="rounded-md border border-slate-700/50 bg-slate-900/40 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Navigation Trail
              </p>
              {navEntries.length > 0 && (
                <div className="space-y-0.5">
                  {navEntries.map((entry, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      {i > 0 && (
                        <svg
                          className="w-2.5 h-2.5 text-slate-600 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 7l5 5m0 0l-5 5"
                          />
                        </svg>
                      )}
                      <span className="text-slate-300 font-mono">{entry.path}</span>
                    </div>
                  ))}
                </div>
              )}
              {breadcrumbSessionId && (
                <p className="mt-1.5 text-[10px] text-slate-500">
                  Session: <span className="font-mono">{breadcrumbSessionId}</span>
                  {historyLength && <span className="ml-2">({historyLength} pages deep)</span>}
                </p>
              )}
            </div>
          )}

          {/* Browser / client context */}
          {hasBrowserContext && (
            <div className="rounded-md border border-slate-700/50 bg-slate-900/40 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Client Context
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {viewport && (
                  <>
                    <span className="text-slate-500">Viewport</span>
                    <span className="text-slate-300 font-mono">{viewport}</span>
                  </>
                )}
                {timezone && (
                  <>
                    <span className="text-slate-500">Timezone</span>
                    <span className="text-slate-300">{timezone}</span>
                  </>
                )}
                {online !== undefined && (
                  <>
                    <span className="text-slate-500">Online</span>
                    <span className="text-slate-300">{online === 'true' ? 'Yes' : 'No'}</span>
                  </>
                )}
                {reportedAt && (
                  <>
                    <span className="text-slate-500">Reported</span>
                    <span className="text-slate-300">{new Date(reportedAt).toLocaleString()}</span>
                  </>
                )}
              </div>
              {userAgent && (
                <p className="mt-2 text-[11px] text-slate-500 break-all font-mono leading-tight">
                  {userAgent}
                </p>
              )}
              {fullUrl && (
                <p className="mt-1 text-[11px] text-slate-500 break-all font-mono">{fullUrl}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
