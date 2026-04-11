// Historical Email Scan - Review Page
// Chef reviews findings surfaced by the background email scan.
// Each card can be imported (creates an inquiry) or dismissed.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getHistoricalFindings, getHistoricalScanStatus } from '@/lib/gmail/historical-scan-actions'
import { HistoricalFindingsList } from '@/components/gmail/historical-findings-list'
import { ScanStatusBar } from '@/components/gmail/scan-status-bar'

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

      {/* Scan status bar - auto-refreshes every 5s when scan is running */}
      {scanStatus && (
        <ScanStatusBar initialStatus={scanStatus} pendingCount={pendingFindings.length} />
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
