// Audit Log - Full audit trail page
// Shows all entity changes with filtering by type, date range, and search.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { fetchRecentChanges } from '@/lib/audit-trail/surface-actions'
import { AuditLogClient } from './audit-log-client'

export const metadata: Metadata = { title: 'Audit Log' }
export const dynamic = 'force-dynamic'

export default async function AuditLogPage() {
  await requireChef()

  let entries: Awaited<ReturnType<typeof fetchRecentChanges>> = []
  let fetchError = false

  try {
    entries = await fetchRecentChanges(200)
  } catch (err) {
    console.error('[AuditLogPage] Failed to load audit entries:', err)
    fetchError = true
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-stone-200">Audit Log</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Complete record of all changes across events, quotes, menus, and financial records.
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-6 text-center">
          <p className="text-red-300 font-medium">Could not load audit log</p>
          <p className="text-red-400 text-sm mt-1">
            There was an error fetching the audit records. Please try refreshing the page.
          </p>
        </div>
      ) : (
        <AuditLogClient entries={entries} />
      )}
    </div>
  )
}
