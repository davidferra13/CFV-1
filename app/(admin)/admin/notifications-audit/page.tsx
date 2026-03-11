// Admin Notifications Delivery Audit — Which channels fired, what failed
// Complements /admin/notifications (in-app feed) with delivery channel visibility

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminDeliveryLog } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { Bell } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-green-900 text-green-200',
  failed: 'bg-red-900 text-red-200',
  skipped: 'bg-stone-800 text-stone-500',
}

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-900 text-blue-200',
  push: 'bg-purple-900 text-purple-200',
  sms: 'bg-yellow-900 text-yellow-200',
}

export default async function AdminNotificationsAuditPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const logs = await getAdminDeliveryLog().catch(() => [])
  const totalSent = logs.filter((l) => l.status === 'sent').length
  const totalFailed = logs.filter((l) => l.status === 'failed').length
  const totalSkipped = logs.filter((l) => l.status === 'skipped').length

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-950 rounded-lg">
          <Bell size={18} className="text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Notification Delivery Audit</h1>
          <p className="text-sm text-stone-500">
            {logs.length} deliver{logs.length !== 1 ? 'ies' : 'y'} · {totalSent} sent ·{' '}
            {totalFailed} failed · {totalSkipped} skipped
          </p>
        </div>
      </div>

      {totalFailed > 0 && (
        <div className="bg-red-950/50 border border-red-900 rounded-xl px-4 py-3 text-sm text-red-400">
          <strong>
            {totalFailed} failed deliver{totalFailed !== 1 ? 'ies' : 'y'}.
          </strong>{' '}
          Check error messages below for details.
        </div>
      )}

      <div className="flex justify-end">
        <CsvExportButton
          data={logs}
          filename="admin-notification-delivery"
          columns={[
            { header: 'Chef', accessor: (l) => l.chefBusinessName },
            { header: 'Channel', accessor: (l) => l.channel },
            { header: 'Status', accessor: (l) => l.status },
            { header: 'Error', accessor: (l) => l.error_message },
            { header: 'Sent At', accessor: (l) => l.sent_at },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No delivery logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Channel
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Error
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Sent At
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-slate-50 transition-colors ${log.status === 'failed' ? 'bg-red-950/20' : ''}`}
                  >
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {log.chefBusinessName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CHANNEL_COLORS[log.channel] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {log.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[log.status] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-400 text-xs max-w-xs truncate">
                      {log.error_message ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(log.sent_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ViewAsChefButton chefId={log.tenant_id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
