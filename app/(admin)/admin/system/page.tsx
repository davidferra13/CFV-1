// Admin System Health — DB row counts, error signals, external links

import { requireAdmin } from '@/lib/auth/admin'
import { getSystemHealthStats } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import { Activity, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'

export default async function AdminSystemPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  let health = null
  let error = null
  try {
    health = await getSystemHealthStats()
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

      {health && (
        <>
          {/* Table Row Counts */}
          <div className="bg-surface rounded-xl border border-slate-200 p-5">
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
          <div className="bg-surface rounded-xl border border-slate-200 p-5">
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
        </>
      )}

      {/* External Links */}
      <div className="bg-surface rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">External Dashboards</h2>
        <div className="space-y-2">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
          >
            <span className="text-sm font-medium text-slate-700">Supabase Dashboard</span>
            <ExternalLink size={14} className="text-slate-400 group-hover:text-slate-600" />
          </a>
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
          >
            <span className="text-sm font-medium text-slate-700">Vercel Deployment Dashboard</span>
            <ExternalLink size={14} className="text-slate-400 group-hover:text-slate-600" />
          </a>
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
