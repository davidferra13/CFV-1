// Admin Gmail Sync — Which chefs have Gmail connected, sync health

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminGmailSync } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { Mail } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'

export default async function AdminGmailSyncPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const syncs = await getAdminGmailSync().catch(() => [])
  const totalSynced = syncs.reduce((s, g) => s + g.totalSynced, 0)
  const totalErrors = syncs.reduce((s, g) => s + g.errorCount, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-950 rounded-lg">
          <Mail size={18} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gmail Sync Health</h1>
          <p className="text-sm text-stone-500">
            {syncs.length} chef{syncs.length !== 1 ? 's' : ''} with Gmail ·{' '}
            {totalSynced.toLocaleString()} emails synced · {totalErrors} errors
          </p>
        </div>
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {syncs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No Gmail sync data found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Emails Synced
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Errors
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Last Sync
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Health
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {syncs.map((g) => {
                  const errorRate = g.totalSynced > 0 ? (g.errorCount / g.totalSynced) * 100 : 0
                  const isHealthy = errorRate < 5
                  const daysSinceSync = g.lastSyncedAt
                    ? Math.floor((Date.now() - new Date(g.lastSyncedAt).getTime()) / 86400000)
                    : null
                  const isStale = daysSinceSync !== null && daysSinceSync > 7
                  return (
                    <tr key={g.chefId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {g.chefBusinessName ?? 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-stone-500 text-xs">{g.chefEmail ?? '-'}</td>
                      <td className="px-4 py-3 text-right text-stone-300">{g.totalSynced}</td>
                      <td className="px-4 py-3 text-right text-red-600">{g.errorCount}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {g.lastSyncedAt
                          ? new Date(g.lastSyncedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isStale ? 'bg-yellow-900 text-yellow-700' : isHealthy ? 'bg-green-900 text-green-700' : 'bg-red-900 text-red-700'}`}
                        >
                          {isStale ? 'Stale' : isHealthy ? 'Healthy' : 'Errors'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ViewAsChefButton chefId={g.chefId} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
