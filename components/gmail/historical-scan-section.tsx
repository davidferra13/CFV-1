'use client'

// Historical Email Scan Section
// Rendered inside the Gmail settings block. Shows the opt-in toggle and
// live scan status. Hidden when Gmail is not connected.

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { enableHistoricalEmailScan, disableHistoricalEmailScan } from '@/lib/gmail/historical-scan-actions'
import type { HistoricalScanStatus } from '@/lib/gmail/historical-scan-actions'

interface HistoricalScanSectionProps {
  initialStatus: HistoricalScanStatus | null
}

export function HistoricalScanSection({ initialStatus }: HistoricalScanSectionProps) {
  const [status, setStatus] = useState<HistoricalScanStatus | null>(initialStatus)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Don't render if Gmail is not connected (status would be null)
  if (!status) return null

  const enabled = status.enabled

  function handleToggle() {
    const willEnable = !enabled
    setError(null)

    // Optimistic update
    setStatus((prev) =>
      prev
        ? {
            ...prev,
            enabled: willEnable,
            status: willEnable ? 'idle' : 'paused',
          }
        : prev
    )

    startTransition(async () => {
      try {
        if (willEnable) {
          await enableHistoricalEmailScan()
        } else {
          await disableHistoricalEmailScan()
        }
      } catch (err: any) {
        // Revert optimistic update on failure
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                enabled: !willEnable,
                status: !willEnable ? 'paused' : 'idle',
              }
            : prev
        )
        setError(err.message || 'Failed to update')
      }
    })
  }

  return (
    <div className="mt-4 border-t border-stone-100 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-900">Historical Email Scan</p>
          <p className="mt-0.5 text-xs text-stone-500">
            Scan your complete Gmail history (last {status.lookbackDays / 365} years) to find
            booking inquiries you may have missed. Processes in the background — nothing is
            imported automatically.
          </p>

          {/* Scan status detail */}
          {enabled && (
            <div className="mt-2">
              {status.status === 'idle' && (
                <p className="text-xs text-stone-400">Starting soon&hellip;</p>
              )}
              {status.status === 'in_progress' && (
                <p className="text-xs text-brand-600">
                  Scanning&hellip; {status.totalProcessed.toLocaleString()} emails processed
                </p>
              )}
              {status.status === 'completed' && (
                <p className="text-xs text-emerald-600">
                  Scan complete &mdash; {status.totalProcessed.toLocaleString()} emails scanned
                </p>
              )}
              {status.status === 'paused' && (
                <p className="text-xs text-stone-400">Paused at {status.totalProcessed.toLocaleString()} emails</p>
              )}
            </div>
          )}

          {/* Link to review findings */}
          {enabled && (status.status === 'in_progress' || status.status === 'completed') && (
            <Link
              href="/inbox/history-scan"
              className="mt-1.5 inline-block text-xs font-medium text-brand-600 hover:text-brand-700 underline underline-offset-2"
            >
              Review Findings &rarr;
            </Link>
          )}
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={isPending}
          onClick={handleToggle}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50
            ${enabled ? 'bg-brand-600' : 'bg-stone-200'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
              transition duration-200 ease-in-out
              ${enabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
