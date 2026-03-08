// Admin Remy Activity — What chefs are asking Remy, actions taken, error rates

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminRemyActivity } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { Bot } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

export default async function AdminRemyActivityPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const activity = await getAdminRemyActivity().catch(() => [])
  const totalActions = activity.reduce((s, a) => s + a.totalActions, 0)
  const totalErrors = activity.reduce((s, a) => s + a.errorCount, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-teal-950 rounded-lg">
          <Bot size={18} className="text-teal-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Remy Activity</h1>
          <p className="text-sm text-stone-500">
            {totalActions.toLocaleString()} total actions · {totalErrors} errors · {activity.length}{' '}
            chef{activity.length !== 1 ? 's' : ''} using Remy
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={activity}
          filename="admin-remy-activity"
          columns={[
            { header: 'Chef', accessor: (a) => a.chefBusinessName },
            { header: 'Total Actions', accessor: (a) => a.totalActions },
            { header: 'Success', accessor: (a) => a.successCount },
            { header: 'Errors', accessor: (a) => a.errorCount },
            {
              header: 'Error Rate',
              accessor: (a) =>
                a.totalActions > 0
                  ? `${((a.errorCount / a.totalActions) * 100).toFixed(1)}%`
                  : '0%',
            },
            { header: 'Top Tasks', accessor: (a) => a.topTaskTypes.join(', ') },
            { header: 'Last Action', accessor: (a) => a.lastActionAt },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {activity.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No Remy activity found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Total Actions
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Success
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Errors
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Error Rate
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Top Tasks
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Last Action
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activity.map((a) => {
                  const errorRate =
                    a.totalActions > 0 ? ((a.errorCount / a.totalActions) * 100).toFixed(1) : '0'
                  const isHighError = parseFloat(errorRate) > 10
                  return (
                    <tr key={a.chefId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {a.chefBusinessName ?? 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-300">{a.totalActions}</td>
                      <td className="px-4 py-3 text-right text-green-600">{a.successCount}</td>
                      <td className="px-4 py-3 text-right text-red-600">{a.errorCount}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-xs font-medium ${isHighError ? 'text-red-500' : 'text-stone-400'}`}
                        >
                          {errorRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {a.topTaskTypes.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-stone-800 text-stone-400"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {a.lastActionAt
                          ? new Date(a.lastActionAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <ViewAsChefButton chefId={a.chefId} />
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
