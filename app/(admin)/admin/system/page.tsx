// Admin System Health - DB row counts, error signals, external links

import { requireAdmin } from '@/lib/auth/admin'
import { getQolMetricsSummary, getSystemHealthStats } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Activity, AlertTriangle, CheckCircle, ExternalLink } from '@/components/ui/icons'

export default async function AdminSystemPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  let health = null
  let qol = null
  let error = null
  try {
    const results = await Promise.allSettled([getSystemHealthStats(), getQolMetricsSummary(30)])
    health = results[0].status === 'fulfilled' ? results[0].value : null
    qol = results[1].status === 'fulfilled' ? results[1].value : null
    if (results[0].status === 'rejected')
      console.error('[admin-system] Health stats failed:', results[0].reason)
    if (results[1].status === 'rejected')
      console.error('[admin-system] QoL metrics failed:', results[1].reason)
    if (!health && !qol) error = 'Failed to load system stats'
  } catch (err) {
    error = 'Failed to load system stats'
    console.error('[Admin] System health error:', err)
  }

  const hasIssues = health ? health.zombieEventCount > 0 || health.orphanedClientCount > 0 : false

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${hasIssues ? 'bg-red-950' : 'bg-green-950'}`}>
          <Activity size={18} className={hasIssues ? 'text-red-600' : 'text-green-600'} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">System Health</h1>
          <p className="text-sm text-slate-500">Database row counts and data integrity signals</p>
        </div>
        {!error && health && (
          <div
            className={`ml-auto flex items-center gap-1.5 text-xs font-medium ${hasIssues ? 'text-red-500' : 'text-green-600'}`}
          >
            {hasIssues ? (
              <>
                <AlertTriangle size={12} /> Issues detected
              </>
            ) : (
              <>
                <CheckCircle size={12} /> All clear
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-950 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-stone-900 rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Operational Checks</h2>
        <Link
          href="/admin/system/payments"
          className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
        >
          Open Payments Health
        </Link>
      </div>

      {health && (
        <>
          <div className="bg-stone-900 rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              QOL Metrics (last 30 days)
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500">Drafts restored</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {qol?.draftRestoreCount ?? 0}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500">Save failures</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {qol?.saveFailureCount ?? 0}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500">Conflicts detected</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{qol?.conflictCount ?? 0}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500">Offline replay success</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {qol?.offlineReplaySuccessCount ?? 0}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500">Offline replay failure</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {qol?.offlineReplayFailureCount ?? 0}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500">Duplicate creates prevented</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {qol?.duplicateCreatePreventedCount ?? 0}
                </p>
                <p className="text-xs-tight text-slate-500 mt-1">
                  Replay success rate:{' '}
                  {qol ? `${Math.round((qol.offlineReplaySuccessRate ?? 0) * 100)}%` : '0%'}
                </p>
              </div>
            </div>
          </div>

          {/* Table Row Counts */}
          <div className="bg-stone-900 rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Database Row Counts</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(health.tableRowCounts).map(([table, count]) => (
                <div key={table} className="bg-slate-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-slate-500 font-mono">{table}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{count.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Signal Panel */}
          <div className="bg-stone-900 rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Integrity Signals</h2>
            <div className="space-y-3">
              <div
                className={`flex items-center justify-between p-3 rounded-lg ${health.zombieEventCount > 0 ? 'bg-red-950' : 'bg-green-950'}`}
              >
                <div className="flex items-center gap-2">
                  {health.zombieEventCount > 0 ? (
                    <AlertTriangle size={14} className="text-red-500" />
                  ) : (
                    <CheckCircle size={14} className="text-green-500" />
                  )}
                  <span className="text-sm text-slate-700">
                    Zombie events (non-terminal &gt; 30 days)
                  </span>
                </div>
                <span
                  className={`text-sm font-bold ${health.zombieEventCount > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {health.zombieEventCount}
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-3 rounded-lg ${health.orphanedClientCount > 0 ? 'bg-red-950' : 'bg-green-950'}`}
              >
                <div className="flex items-center gap-2">
                  {health.orphanedClientCount > 0 ? (
                    <AlertTriangle size={14} className="text-red-500" />
                  ) : (
                    <CheckCircle size={14} className="text-green-500" />
                  )}
                  <span className="text-sm text-slate-700">Orphaned clients (no tenant)</span>
                </div>
                <span
                  className={`text-sm font-bold ${health.orphanedClientCount > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {health.orphanedClientCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-slate-400" />
                  <span className="text-sm text-slate-700">Oldest unread message</span>
                </div>
                <span className="text-sm text-slate-600">
                  {health.oldestUnreadMessage
                    ? new Date(health.oldestUnreadMessage).toLocaleString()
                    : 'None'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-stone-900 rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Owner Identity Warnings</h2>
            {health.warnings.length > 0 ? (
              <ul className="space-y-2">
                {health.warnings.map((warning) => (
                  <li
                    key={warning}
                    className="text-sm text-amber-700 bg-amber-950 rounded-lg px-3 py-2"
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No owner identity warnings detected.</p>
            )}
          </div>
        </>
      )}

      {/* External Links */}
      <div className="bg-stone-900 rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">External Dashboards</h2>
        <div className="space-y-2">
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
          >
            <span className="text-sm font-medium text-slate-700">Stripe Dashboard</span>
            <ExternalLink size={14} className="text-slate-400 group-hover:text-slate-600" />
          </a>
        </div>
      </div>
    </div>
  )
}
