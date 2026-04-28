// Admin Audit Log - immutable record of sensitive platform actions

import { requireAdmin } from '@/lib/auth/admin'
import { getPlatformAuditLog } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import { ScrollText } from '@/components/ui/icons'
import { AdminAuditLog, type AdminAuditLogEntry } from './log'

export default async function AdminAuditPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  let entries: AdminAuditLogEntry[] = []
  let note: string | null = null
  try {
    entries = (await getPlatformAuditLog(200)) as AdminAuditLogEntry[]
  } catch {
    note =
      'admin_audit_log table not yet created. Apply the admin migrations to enable this feature.'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-stone-800 rounded-lg">
          <ScrollText size={18} className="text-stone-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100">Audit Log</h1>
          <p className="text-sm text-stone-500">
            Immutable record of every sensitive platform action
          </p>
        </div>
      </div>

      {note && (
        <div className="bg-amber-950 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
        {!note ? <AdminAuditLog entries={entries} /> : null}
      </div>
    </div>
  )
}
