import type { CohortAnalysis } from '@/lib/intelligence/client-lifetime-journey'
import { formatCurrency } from '@/lib/utils/currency'

interface Props {
  cohorts: CohortAnalysis[]
}

export function CohortRetentionTable({ cohorts }: Props) {
  const filtered = cohorts.filter((c) => c.clientsAcquired >= 3)
  if (filtered.length === 0) return null

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-800">
        <h3 className="text-sm font-medium text-stone-300">Cohort Retention</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-800">
              <th className="px-4 py-2 text-left text-stone-400 font-medium">Cohort</th>
              <th className="px-4 py-2 text-right text-stone-400 font-medium">Acquired</th>
              <th className="px-4 py-2 text-right text-stone-400 font-medium">Retained</th>
              <th className="px-4 py-2 text-right text-stone-400 font-medium">Rate</th>
              <th className="px-4 py-2 text-right text-stone-400 font-medium">Avg Revenue</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.cohort} className="border-b border-stone-800 last:border-0">
                <td className="px-4 py-2 text-stone-100">{c.cohort}</td>
                <td className="px-4 py-2 text-right text-stone-100">{c.clientsAcquired}</td>
                <td className="px-4 py-2 text-right text-stone-100">{c.retained}</td>
                <td className="px-4 py-2 text-right text-stone-100">{c.retentionRate}%</td>
                <td className="px-4 py-2 text-right text-stone-100">
                  {formatCurrency(c.avgLifetimeRevenueCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
