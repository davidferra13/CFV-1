'use client'

import { useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { Button } from '@/components/ui/button'
import {
  submitIssueReport,
  type ReportCategory,
  type IssueReportInput,
} from '@/lib/feedback/report-issue-actions'

const CATEGORIES: Array<{ value: ReportCategory; label: string; description: string }> = [
  { value: 'bug', label: 'Bug', description: 'Something is broken or not working right' },
  {
    value: 'feature_not_working',
    label: 'Feature Issue',
    description: 'A feature is not performing as expected',
  },
  {
    value: 'error_report',
    label: 'Error / Crash',
    description: 'You hit an error screen or got locked out',
  },
  {
    value: 'malicious_activity',
    label: 'Malicious Activity',
    description: 'Suspicious behavior, spam, or abuse',
  },
  {
    value: 'security_concern',
    label: 'Security Concern',
    description: 'A potential security or privacy issue',
  },
  { value: 'other', label: 'Other', description: 'Something else' },
]

export type ErrorContext = {
  errorMessage?: string
  errorDigest?: string
  errorStack?: string
  boundary?: string
}

type ReportIssueDialogProps = {
  open: boolean
  onClose: () => void
  /** Pre-fill with error context when opened from an error boundary */
  errorContext?: ErrorContext
  /** Pre-select a category */
  defaultCategory?: ReportCategory
}

export function ReportIssueDialog({
  open,
  onClose,
  errorContext,
  defaultCategory,
}: ReportIssueDialogProps) {
  const pathname = usePathname()
  const [category, setCategory] = useState<ReportCategory>(
    defaultCategory ?? (errorContext ? 'error_report' : 'bug')
  )
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function collectRecentBreadcrumbs(): Array<{ path: string; timestamp: string }> {
    if (typeof window === 'undefined') return []
    try {
      // BreadcrumbTracker stores its queue in memory, but we can read the
      // session's breadcrumb data from the API batch queue pattern.
      // As a lightweight alternative, read from performance navigation entries.
      const entries = performance.getEntriesByType('navigation')
      const navHistory: Array<{ path: string; timestamp: string }> = []

      // Grab browser history length as a signal
      const histLen = window.history.length

      // Read the current path plus any referrer chain
      if (document.referrer) {
        try {
          const refUrl = new URL(document.referrer)
          if (refUrl.origin === window.location.origin) {
            navHistory.push({ path: refUrl.pathname, timestamp: '' })
          }
        } catch {
          /* ignore invalid referrer */
        }
      }
      navHistory.push({ path: window.location.pathname, timestamp: new Date().toISOString() })

      // Also check sessionStorage for breadcrumb session ID (proves tracker is active)
      const sessionId = window.sessionStorage.getItem('cf-breadcrumb-session')
      if (sessionId) {
        // The breadcrumbs are batched to the API, so for the report we store the session ID
        // so the admin can look up the full trail server-side
        navHistory.push({ path: `__session:${sessionId}`, timestamp: '' })
      }

      return navHistory.slice(-10)
    } catch {
      return []
    }
  }

  function collectClientContext(): Record<string, string> {
    if (typeof window === 'undefined') return {}
    const breadcrumbs = collectRecentBreadcrumbs()
    return {
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      screenSize: `${screen.width}x${screen.height}`,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: String(navigator.onLine),
      referrer: document.referrer || 'direct',
      fullUrl: window.location.href,
      historyLength: String(window.history.length),
      ...(breadcrumbs.length > 0 ? { navigationHistory: JSON.stringify(breadcrumbs) } : {}),
      ...(window.sessionStorage.getItem('cf-breadcrumb-session')
        ? { breadcrumbSessionId: window.sessionStorage.getItem('cf-breadcrumb-session')! }
        : {}),
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const clientContext = collectClientContext()

    const input: IssueReportInput = {
      category,
      message,
      pageUrl: pathname ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
      clientContext,
      ...(errorContext ? { errorContext } : {}),
    }

    startTransition(async () => {
      try {
        const result = await submitIssueReport(input)
        if (!result.success) {
          setError(result.error ?? 'Failed to submit report.')
          return
        }
        setSubmitted(true)
      } catch {
        setError('Failed to submit report. Please try again.')
      }
    })
  }

  function handleClose() {
    // Reset state when closing
    if (submitted) {
      setSubmitted(false)
      setMessage('')
      setError(null)
    }
    onClose()
  }

  if (submitted) {
    return (
      <AccessibleDialog
        open={open}
        title="Report Submitted"
        onClose={handleClose}
        closeOnBackdrop
        footer={
          <Button variant="primary" onClick={handleClose}>
            Close
          </Button>
        }
      >
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Your report has been sent to the development team. We will investigate and follow up if
          needed.
        </div>
      </AccessibleDialog>
    )
  }

  return (
    <AccessibleDialog
      open={open}
      title="Report an Issue"
      description="Help us fix problems and keep ChefFlow safe. Your report goes directly to the development team."
      onClose={handleClose}
      widthClassName="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isPending || message.trim().length === 0}
          >
            {isPending ? 'Submitting...' : 'Submit Report'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category selector */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-200">
            What are you reporting?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  category === cat.value
                    ? 'border-amber-600 bg-amber-950/40 text-amber-200'
                    : 'border-stone-700 bg-stone-900/50 text-stone-300 hover:border-stone-500'
                }`}
              >
                <span className="font-medium">{cat.label}</span>
                <span className="mt-0.5 block text-xs text-stone-400">{cat.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error context display (read-only, when from error boundary) */}
        {errorContext?.errorMessage && (
          <div className="rounded-lg border border-red-900 bg-red-950/30 p-3">
            <p className="text-xs font-medium text-red-400 mb-1">Captured error</p>
            <p className="text-xs text-red-300 font-mono break-all">{errorContext.errorMessage}</p>
            {errorContext.errorDigest && (
              <p className="text-xs text-red-500 mt-1">ID: {errorContext.errorDigest}</p>
            )}
          </div>
        )}

        {/* Message */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-200">Describe what happened</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={
              errorContext
                ? 'What were you doing when this error appeared? Any details help us fix it faster.'
                : 'Describe the issue. What happened? What did you expect?'
            }
            className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
            required
          />
          <p className="text-xs text-stone-500">{message.length}/2000</p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </AccessibleDialog>
  )
}
