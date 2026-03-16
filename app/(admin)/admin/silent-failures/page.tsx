// Admin Silent Failures Dashboard
// Surfaces non-blocking operation failures that would otherwise only appear in console.error.
// Records come from lib/monitoring/non-blocking.ts writing to side_effect_failures table.

import { requireAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import { getFailureSummary, getSideEffectFailures } from '@/lib/monitoring/failure-actions'
import { AlertTriangle } from '@/components/ui/icons'
import { SilentFailuresClient } from './silent-failures-client'

export default async function AdminSilentFailuresPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  let failures: Awaited<ReturnType<typeof getSideEffectFailures>> = { failures: [], total: 0 }
  let summary: Awaited<ReturnType<typeof getFailureSummary>> = {
    total: 0,
    bySeverity: {},
    bySource: [],
  }
  let tableExists = true

  try {
    ;[failures, summary] = await Promise.all([
      getSideEffectFailures({ limit: 200 }),
      getFailureSummary(),
    ])
  } catch {
    tableExists = false
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${summary.total > 0 ? 'bg-red-950' : 'bg-green-950'}`}>
          <AlertTriangle
            size={18}
            className={summary.total > 0 ? 'text-red-500' : 'text-green-500'}
          />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Silent Failures</h1>
          <p className="text-sm text-slate-500">
            Non-blocking operations that failed without user visibility
          </p>
        </div>
        {tableExists && (
          <div
            className={`ml-auto text-xs font-medium px-2 py-1 rounded ${
              summary.total === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {summary.total === 0 ? 'All clear' : `${summary.total} unresolved`}
          </div>
        )}
      </div>

      {!tableExists && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          side_effect_failures table not yet created. Apply migration 20260401000064 to enable this
          dashboard.
        </div>
      )}

      {tableExists && summary.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
            const count = summary.bySeverity[sev] ?? 0
            const colors = {
              critical: 'bg-red-50 text-red-700 border-red-200',
              high: 'bg-orange-50 text-orange-700 border-orange-200',
              medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
              low: 'bg-slate-50 text-slate-600 border-slate-200',
            }
            return (
              <div key={sev} className={`rounded-lg border px-3 py-2 text-center ${colors[sev]}`}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs capitalize">{sev}</div>
              </div>
            )
          })}
        </div>
      )}

      {tableExists && summary.bySource.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">By Source</h2>
          <div className="flex flex-wrap gap-2">
            {summary.bySource.map(({ source, count }) => (
              <span
                key={source}
                className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full"
              >
                <span className="font-medium">{source}</span>
                <span className="text-slate-400">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {tableExists && <SilentFailuresClient initialFailures={failures.failures} />}
    </div>
  )
}
