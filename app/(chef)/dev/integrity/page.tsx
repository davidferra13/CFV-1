// System Integrity Interrogation - Admin Diagnostic Page
// Runs all integrity checks and displays the results.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { runIntegrityInterrogation } from '@/lib/system-integrity/engine'
import { IntegrityReportView } from './integrity-report-view'

export const metadata: Metadata = { title: 'System Check' }

export default async function IntegrityPage() {
  await requireChef()
  const report = await runIntegrityInterrogation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-100">System Check</h1>
        <p className="text-sm text-stone-400 mt-1">
          Self-diagnostic checks for data consistency, orphaned records, and configuration gaps.
        </p>
      </div>
      <IntegrityReportView report={report} />
    </div>
  )
}
