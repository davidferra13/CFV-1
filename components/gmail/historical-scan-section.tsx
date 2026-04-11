'use client'

// Historical Email Scan Section
// Rendered inside the Gmail settings block. Uses a deliberate two-step
// confirmation flow instead of a toggle - users should feel in control,
// not pressured. Heavy emphasis on privacy: we FILTER OUT junk, we don't
// read your emails.

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  enableHistoricalEmailScan,
  disableHistoricalEmailScan,
} from '@/lib/gmail/historical-scan-actions'
import type { HistoricalScanStatus } from '@/lib/gmail/historical-scan-actions'

interface HistoricalScanSectionProps {
  initialStatus: HistoricalScanStatus | null
}

export function HistoricalScanSection({ initialStatus }: HistoricalScanSectionProps) {
  const [status, setStatus] = useState<HistoricalScanStatus | null>(initialStatus)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  // Don't render if Gmail is not connected (status would be null)
  if (!status) return null

  const enabled = status.enabled
  const isRunning = enabled && (status.status === 'in_progress' || status.status === 'idle')
  const isComplete = enabled && status.status === 'completed'
  const idleMessage =
    status.totalProcessed > 0 || status.lastRunAt
      ? 'Scan enabled - waiting for the next background batch to continue.'
      : 'Scan enabled - waiting for the background worker to start.'

  function handleStartClick() {
    setShowConfirm(true)
    setConfirmText('')
    setError(null)
  }

  function handleConfirmEnable() {
    if (confirmText.toLowerCase() !== 'scan') return

    setShowConfirm(false)
    setError(null)

    // Optimistic update
    setStatus((prev) => (prev ? { ...prev, enabled: true, status: 'idle' } : prev))

    startTransition(async () => {
      try {
        await enableHistoricalEmailScan()
      } catch (err: any) {
        setStatus((prev) => (prev ? { ...prev, enabled: false, status: 'idle' } : prev))
        setError(err.message || 'Failed to start scan')
      }
    })
  }

  function handleDisable() {
    setError(null)

    setStatus((prev) => (prev ? { ...prev, enabled: false, status: 'paused' } : prev))

    startTransition(async () => {
      try {
        await disableHistoricalEmailScan()
      } catch (err: any) {
        setStatus((prev) => (prev ? { ...prev, enabled: true, status: 'in_progress' } : prev))
        setError(err.message || 'Failed to pause scan')
      }
    })
  }

  return (
    <div className="mt-4 border-t border-stone-800 pt-4">
      <div className="space-y-3">
        {/* Header */}
        <div>
          <p className="text-sm font-medium text-stone-100">Find Missed Inquiries</p>
          <p className="mt-1 text-xs text-stone-500 leading-relaxed">
            Scan your complete Gmail history to surface booking inquiries you may have missed. This
            works by <span className="text-stone-400">filtering out</span> everything that
            isn&apos;t a potential client &mdash; spam, newsletters, notifications, personal emails
            &mdash; so only real business inquiries surface for your review.
          </p>
        </div>

        {/* Privacy reassurance block */}
        {!enabled && !showConfirm && (
          <div className="rounded-lg bg-stone-900/60 border border-stone-800 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <svg
                className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              <div className="text-xs text-stone-400 space-y-1.5">
                <p>
                  <span className="text-stone-300 font-medium">How it works:</span> A 6-layer
                  filtration system runs on each email &mdash; Gmail&apos;s own spam labels, mailing
                  list headers, unsubscribe patterns, and known marketing domains are checked{' '}
                  <em>before</em> any AI runs. Most junk is blocked by pure math, no AI needed.
                </p>
                <p>
                  <span className="text-stone-300 font-medium">What we don&apos;t do:</span> We
                  don&apos;t store, read, or index your emails. The scan checks each email against
                  the filter, keeps a one-line summary if it looks like a booking inquiry, and moves
                  on. Everything else is discarded immediately.
                </p>
                <p>
                  <span className="text-stone-300 font-medium">You stay in control:</span> Nothing
                  is imported automatically. Any potential inquiries found are staged for your
                  review &mdash; you decide what to keep and what to dismiss. You can pause or stop
                  the scan at any time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action area */}
        {!enabled && !showConfirm && (
          <Button variant="secondary" size="sm" onClick={handleStartClick} disabled={isPending}>
            Start Full Inbox Scan
          </Button>
        )}

        {/* Confirmation step - requires typing "scan" */}
        {showConfirm && (
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 space-y-3">
            <p className="text-sm text-stone-200">
              This will scan your <span className="font-medium">entire Gmail history</span> in the
              background. It may take a while depending on how many emails you have.
            </p>
            <p className="text-xs text-stone-400">
              Only potential booking inquiries will be surfaced for review. Everything else (spam,
              newsletters, personal emails) is filtered out and discarded.
            </p>
            <div className="space-y-2">
              <label htmlFor="confirm-scan" className="text-xs text-stone-500">
                Type{' '}
                <span className="font-mono text-stone-300 bg-stone-800 px-1.5 py-0.5 rounded">
                  scan
                </span>{' '}
                to confirm
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="confirm-scan"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="scan"
                  autoComplete="off"
                  className="w-32 rounded bg-stone-900 border border-stone-700 px-2 py-1.5 text-sm text-stone-100 placeholder:text-stone-600 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmEnable()
                    if (e.key === 'Escape') setShowConfirm(false)
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmEnable}
                  disabled={confirmText.toLowerCase() !== 'scan' || isPending}
                  loading={isPending}
                >
                  Confirm
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Running / completed / paused states */}
        {enabled && (
          <div className="space-y-2">
            {status.status === 'idle' && <p className="text-xs text-stone-400">{idleMessage}</p>}
            {status.status === 'in_progress' && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-brand-600 animate-pulse" />
                <p className="text-xs text-brand-500">
                  Scanning&hellip; {status.totalProcessed.toLocaleString()} emails filtered so far
                </p>
              </div>
            )}
            {status.status === 'completed' && (
              <p className="text-xs text-emerald-500">
                Scan complete &mdash; {status.totalProcessed.toLocaleString()} emails filtered
              </p>
            )}
            {status.status === 'paused' && (
              <p className="text-xs text-stone-400">
                Paused at {status.totalProcessed.toLocaleString()} emails
              </p>
            )}

            {/* Link to review findings */}
            {(status.status === 'in_progress' || status.status === 'completed') && (
              <Link
                href="/inbox/history-scan"
                className="inline-block text-xs font-medium text-brand-500 hover:text-brand-400 underline underline-offset-2"
              >
                Review Findings &rarr;
              </Link>
            )}

            {/* Pause / Resume controls */}
            {isRunning && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisable}
                disabled={isPending}
                className="text-xs"
              >
                Pause Scan
              </Button>
            )}
            {status.status === 'paused' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setStatus((prev) => (prev ? { ...prev, enabled: true, status: 'idle' } : prev))
                  startTransition(async () => {
                    try {
                      await enableHistoricalEmailScan()
                    } catch (err: any) {
                      setStatus((prev) =>
                        prev ? { ...prev, enabled: false, status: 'paused' } : prev
                      )
                      setError(err.message || 'Failed to resume scan')
                    }
                  })
                }}
                disabled={isPending}
                loading={isPending}
              >
                Resume Scan
              </Button>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  )
}
