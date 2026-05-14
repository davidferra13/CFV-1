import { requireAdmin } from '@/lib/auth/admin'
import { getPieCompliance, type LawStatus } from '@/lib/pricing/pie-compliance'

export const metadata = {
  title: 'PIE Compliance | Admin',
}

function statusColor(status: LawStatus): string {
  switch (status) {
    case 'passing':
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'warning':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'violation':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'catastrophic':
      return 'bg-red-700/30 text-red-300 border-red-500/50 animate-pulse'
  }
}

function statusLabel(status: LawStatus): string {
  switch (status) {
    case 'passing':
      return 'PASS'
    case 'warning':
      return 'WARN'
    case 'violation':
      return 'FAIL'
    case 'catastrophic':
      return 'CRITICAL'
  }
}

export default async function PieCompliancePage() {
  await requireAdmin()

  const report = await getPieCompliance()
  const passingCount = report.laws.filter((l) => l.status === 'passing').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">PIE Compliance</h1>
        <p className="text-stone-400 mt-1">Real-time compliance status for all PIE laws.</p>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-4">
        <div className={`rounded-xl border px-5 py-3 ${statusColor(report.overallStatus)}`}>
          <p className="text-xs uppercase tracking-wider opacity-70 mb-1">Overall</p>
          <p className="text-2xl font-bold">{statusLabel(report.overallStatus)}</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 px-5 py-3">
          <p className="text-xs text-stone-500 mb-1">Laws Passing</p>
          <p className="text-2xl font-bold text-stone-100">
            {passingCount}/{report.laws.length}
          </p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 px-5 py-3">
          <p className="text-xs text-stone-500 mb-1">Census Size</p>
          <p className="text-2xl font-bold text-stone-100 tabular-nums">
            {report.censusSize.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 px-5 py-3">
          <p className="text-xs text-stone-500 mb-1">Regions</p>
          <p className="text-2xl font-bold text-stone-100 tabular-nums">
            {report.totalRegions.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 px-5 py-3">
          <p className="text-xs text-stone-500 mb-1">Coverage</p>
          <p className="text-2xl font-bold text-stone-100 tabular-nums">
            {report.coveragePct.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 px-5 py-3">
          <p className="text-xs text-stone-500 mb-1">Price Cells</p>
          <p className="text-2xl font-bold text-stone-100 tabular-nums">
            {report.filledCells.toLocaleString()}/{report.totalPriceCells.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Law table */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-800 text-stone-500 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Law</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Metric</th>
              <th className="text-right px-4 py-3">Target</th>
              <th className="text-left px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody>
            {report.laws.map((law) => (
              <tr key={law.law} className="border-b border-stone-800/50 hover:bg-stone-800/30">
                <td className="px-4 py-3 text-stone-400 font-mono">#{law.law}</td>
                <td className="px-4 py-3 text-stone-200 font-medium">{law.name}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block rounded-full border px-3 py-0.5 text-xs font-semibold ${statusColor(law.status)}`}
                  >
                    {statusLabel(law.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-stone-300 tabular-nums font-mono">
                  {typeof law.metric === 'number' ? law.metric.toLocaleString() : law.metric}
                </td>
                <td className="px-4 py-3 text-right text-stone-500 tabular-nums font-mono">
                  {law.target.toLocaleString()} {law.unit}
                </td>
                <td className="px-4 py-3 text-stone-400 text-xs max-w-xs truncate">{law.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Timestamp */}
      <p className="text-xs text-stone-600 text-right">
        Generated: {new Date(report.generatedAt).toLocaleString()}
      </p>
    </div>
  )
}
