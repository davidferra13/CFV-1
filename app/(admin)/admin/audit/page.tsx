// Admin Audit Log — immutable record of sensitive platform actions

import { requireAdmin } from '@/lib/auth/admin'
import { getPlatformAuditLog } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import { ScrollText } from 'lucide-react'

export default async function AdminAuditPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  let entries: Record<string, unknown>[] = []
  let note: string | null = null
  try {
    entries = await getPlatformAuditLog(200)
  } catch {
    note = 'admin_audit_log table not yet created. Apply the admin migrations to enable this feature.'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded-lg">
          <ScrollText size={18} className="text-slate-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500">Immutable record of every sensitive platform action</p>
        </div>
      </div>

      {note && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {entries.length === 0 && !note ? (
          <div className="py-12 text-center text-slate-400 text-sm">No audit log entries yet.</div>
        ) : entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Actor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={String(entry.id)} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                      {entry.ts ? new Date(String(entry.ts)).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{String(entry.actor_email ?? '—')}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                        {String(entry.action_type ?? '—')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {entry.target_type ? `${entry.target_type}: ` : ''}
                      {entry.target_id ? String(entry.target_id).slice(0, 12) + '…' : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 max-w-[200px] truncate">
                      {entry.details ? JSON.stringify(entry.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )
}
