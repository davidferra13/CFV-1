'use client'

import { useState } from 'react'
import { ReportIssueDialog } from './report-issue-dialog'

/**
 * Floating "Report Issue" button rendered in portal layouts.
 * Fixed to bottom-left so it doesn't conflict with Remy (bottom-right)
 * or mobile nav (bottom center).
 */
export function GlobalReportButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Report an issue"
        title="Report an issue"
        className="fixed bottom-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-stone-900/90 text-stone-400 shadow-lg backdrop-blur-sm transition-colors hover:border-amber-600 hover:text-amber-400 hover:bg-stone-800/90 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-stone-900 md:h-9 md:w-auto md:rounded-lg md:px-3 md:gap-2"
      >
        {/* Flag icon */}
        <svg
          className="h-4 w-4 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z"
          />
        </svg>
        <span className="hidden md:inline text-xs font-medium">Report Issue</span>
      </button>
      <ReportIssueDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
