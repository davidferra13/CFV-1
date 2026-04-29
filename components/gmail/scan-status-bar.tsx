'use client'

// Scan Status Bar - auto-refreshes every 5s when a scan is in progress.

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { trackedRouterRefresh } from '@/lib/runtime/tracked-router-refresh'
import type { HistoricalScanStatus } from '@/lib/gmail/historical-scan-actions'

interface ScanStatusBarProps {
  initialStatus: HistoricalScanStatus
  pendingCount: number
}

export function ScanStatusBar({ initialStatus, pendingCount }: ScanStatusBarProps) {
  const [status, setStatus] = useState(initialStatus)
  const [count, setCount] = useState(pendingCount)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status.status !== 'in_progress') return

    const interval = setInterval(() => {
      // Refresh the page to get fresh server data
      trackedRouterRefresh(router, {
        pathname,
        source: 'gmail-scan-status-bar',
        entity: 'gmail',
        event: 'scan_poll',
        reason: 'historical-scan-in-progress',
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [pathname, router, status.status])

  // Sync with server-refreshed props
  useEffect(() => {
    setStatus(initialStatus)
    setCount(pendingCount)
  }, [initialStatus, pendingCount])

  return (
    <div className="mb-6 rounded-lg border border-stone-700 bg-stone-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          {status.status === 'idle' && (
            <span className="text-stone-500">Scan starting soon...</span>
          )}
          {status.status === 'in_progress' && (
            <span className="text-brand-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-brand-400 animate-pulse shrink-0" />
              Scanning your email history: <strong>{status.totalProcessed.toLocaleString()}</strong>{' '}
              emails processed so far
            </span>
          )}
          {status.status === 'completed' && (
            <span className="text-emerald-400">
              Scan complete: <strong>{status.totalProcessed.toLocaleString()}</strong> emails
              scanned
            </span>
          )}
          {status.status === 'paused' && (
            <span className="text-stone-500">
              Scan paused at {status.totalProcessed.toLocaleString()} emails. Re-enable in{' '}
              <a href="/settings" className="underline">
                Settings
              </a>{' '}
              to continue.
            </span>
          )}
          {!status.enabled && status.status !== 'completed' && (
            <span className="text-stone-500">
              Historical scan is off.{' '}
              <a href="/settings" className="underline">
                Enable in Settings
              </a>{' '}
              to scan your email history.
            </span>
          )}
        </div>
        <div className="text-xs text-stone-400">
          {count > 0 && <span className="font-medium text-brand-600">{count} pending</span>}
        </div>
      </div>
    </div>
  )
}
