// Historical Email Scan - Review Page
// Chef reviews findings surfaced by the background email scan.
// Each card can be imported (creates an inquiry) or dismissed.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getHistoricalFindings, getHistoricalScanStatus } from '@/lib/gmail/historical-scan-actions'
import { HistoricalFindingsList } from '@/components/gmail/historical-findings-list'

export const metadata: Metadata = { title: 'Email History Scan' }

export default async function HistoryScanPage() {
  await requireChef()

  const [scanStatus, pendingFindings, importedFindings, dismissedFindings] = await Promise.all([
    getHistoricalScanStatus(),
    getHistoricalFindings('pending', 100),
    getHistoricalFindings('imported', 50),
    getHistoricalFindings('dismissed', 50),
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-stone-500 mb-2">
          <Link href="/inbox" className="hover:text-stone-300">
            Inbox
          </Link>
          <span>/</span>
          <span>Email History Scan</span>
        </div>
        <h1 className="text-2xl font-semibold text-stone-100">Email History Scan</h1>
        <p className="mt-1 text-sm text-stone-400">
          Emails from your Gmail history that may be missed booking inquiries or client
          conversations. Review each one and import what matters.
        </p>
      </div>

      {/* Scan status bar */}
      {scanStatus && (
        <div className="mb-6 rounded-lg border border-stone-700 bg-stone-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {scanStatus.status === 'idle' && (
                <span className="text-stone-500">Scan starting soon&hellip;</span>
              )}
              {scanStatus.status === 'in_progress' && (
                <span className="text-brand-400">
                  Scanning your email history &mdash;{' '}
                  <strong>{scanStatus.totalProcessed.toLocaleString()}</strong> emails processed so
                  far
                </span>
              )}
              {scanStatus.status === 'completed' && (
                <span className="text-emerald-700">
                  Scan complete &mdash;{' '}
                  <strong>{scanStatus.totalProcessed.toLocaleString()}</strong> emails scanned
                </span>
              )}
              {scanStatus.status === 'paused' && (
                <span className="text-stone-500">
                  Scan paused at {scanStatus.totalProcessed.toLocaleString()} emails. Re-enable in{' '}
                  <Link href="/settings" className="underline">
                    Settings
                  </Link>{' '}
                  to continue.
                </span>
              )}
              {!scanStatus.enabled && scanStatus.status !== 'completed' && (
                <span className="text-stone-500">
                  Historical scan is off.{' '}
                  <Link href="/settings" className="underline">
                    Enable in Settings
                  </Link>{' '}
                  to scan your email history.
                </span>
              )}
            </div>
            <div className="text-xs text-stone-400">
              {pendingFindings.length > 0 && (
                <span className="font-medium text-brand-600">{pendingFindings.length} pending</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Findings list */}
      <HistoricalFindingsList
        pending={pendingFindings}
        imported={importedFindings}
        dismissed={dismissedFindings}
      />
    </div>
  )
}
