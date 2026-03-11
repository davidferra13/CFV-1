// Historical Email Scan — Review Page
// Chef reviews findings surfaced by the background email scan.
// Each card can be imported (creates an inquiry) or dismissed.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getHistoricalFindings, getHistoricalScanStatus } from '@/lib/gmail/historical-scan-actions'
import { HistoricalFindingsList } from '@/components/gmail/historical-findings-list'

export const metadata: Metadata = { title: 'Email History Scan — ChefFlow' }

export default async function HistoryScanPage() {
  await requireChef()

  const [scanStatus, pendingFindings, importedFindings, dismissedFindings] = await Promise.all([
    getHistoricalScanStatus(),
    getHistoricalFindings('pending', 100),
    getHistoricalFindings('imported', 50),
    getHistoricalFindings('dismissed', 50),
  ])

  const progressSummary = scanStatus ? formatProgressSummary(scanStatus) : null
  const lastRunLabel = scanStatus ? formatScanTimestamp(scanStatus.lastRunAt) : null

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
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm">
              {scanStatus.status === 'idle' && (
                <span className="text-stone-500">Scan starting soon&hellip;</span>
              )}
              {scanStatus.status === 'in_progress' && (
                <span className="text-brand-400">
                  Scanning your email history &mdash; <strong>{progressSummary}</strong>
                </span>
              )}
              {scanStatus.status === 'completed' && (
                <span className="text-emerald-200">
                  Scan complete &mdash; <strong>{progressSummary}</strong>
                </span>
              )}
              {scanStatus.status === 'paused' && (
                <span className="text-stone-500">
                  Scan paused at {progressSummary}. Re-enable in{' '}
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
          {(scanStatus.status === 'in_progress' ||
            scanStatus.status === 'completed' ||
            scanStatus.status === 'paused' ||
            scanStatus.status === 'idle') && (
            <div className="mt-3 space-y-2">
              <ProgressMeter
                percent={scanStatus.status === 'completed' ? 100 : scanStatus.percentComplete}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
                <span>{scanStatus.totalProcessed.toLocaleString()} fully processed</span>
                {scanStatus.includeSpamTrash && (
                  <span className="rounded-full border border-stone-700 bg-stone-900 px-2 py-0.5 text-stone-300">
                    Includes Spam &amp; Trash
                  </span>
                )}
                {lastRunLabel && <span>Last batch {lastRunLabel}</span>}
              </div>
            </div>
          )}
          {scanStatus.mailboxes.length > 1 && (
            <div className="mt-3 space-y-2 border-t border-stone-700 pt-3">
              {scanStatus.mailboxes.map((mailbox) => (
                <div key={mailbox.id} className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
                    <span>
                      {mailbox.email}
                      {mailbox.isPrimary ? ' · primary' : ''}
                    </span>
                    <span>{formatProgressSummary(mailbox)}</span>
                  </div>
                  <ProgressMeter
                    percent={mailbox.status === 'completed' ? 100 : mailbox.percentComplete}
                  />
                </div>
              ))}
            </div>
          )}
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

function ProgressMeter({ percent }: { percent: number | null }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-stone-900">
      <div
        className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
        style={{ width: `${percent ?? 0}%` }}
      />
    </div>
  )
}

function formatProgressSummary(
  scanStatus: Pick<
    NonNullable<Awaited<ReturnType<typeof getHistoricalScanStatus>>>,
    'estimatedTotal' | 'percentComplete' | 'totalSeen'
  >
): string {
  const seen = scanStatus.totalSeen.toLocaleString()
  if (scanStatus.estimatedTotal) {
    const estimatedTotal = scanStatus.estimatedTotal.toLocaleString()
    const percent = scanStatus.percentComplete != null ? ` (${scanStatus.percentComplete}%)` : ''
    return `${seen} of about ${estimatedTotal} emails scanned${percent}`
  }

  return `${seen} emails scanned`
}

function formatScanTimestamp(value: string | null): string | null {
  if (!value) return null

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
