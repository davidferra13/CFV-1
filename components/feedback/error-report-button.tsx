'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ReportIssueDialog, type ErrorContext } from './report-issue-dialog'

type ErrorReportButtonProps = {
  error: Error & { digest?: string }
  boundary?: string
}

/**
 * "Report this error" button for error boundaries.
 * Opens the ReportIssueDialog pre-filled with captured error context.
 */
export function ErrorReportButton({ error, boundary }: ErrorReportButtonProps) {
  const [open, setOpen] = useState(false)

  const errorContext: ErrorContext = {
    errorMessage: error.message,
    errorDigest: error.digest,
    errorStack: error.stack?.slice(0, 1000),
    boundary: boundary ?? 'unknown',
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} className="w-full">
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        Report this error
      </Button>
      <ReportIssueDialog
        open={open}
        onClose={() => setOpen(false)}
        errorContext={errorContext}
        defaultCategory="error_report"
      />
    </>
  )
}
