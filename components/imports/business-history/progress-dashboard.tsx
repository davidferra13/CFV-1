import Link from 'next/link'
import type { BusinessHistorySummary } from '@/lib/business-history-import/types'

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
      <p className="text-2xl font-semibold text-stone-100">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-stone-500">{label}</p>
    </div>
  )

  return href ? (
    <Link href={href} className="block hover:border-stone-600">
      {content}
    </Link>
  ) : (
    content
  )
}

export function BusinessHistoryProgressDashboard({ summary }: { summary: BusinessHistorySummary }) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-100">Reconstruction progress</h2>
          <p className="mt-1 text-sm text-stone-500">
            Counts are tenant-scoped live records plus staged Gmail findings.
          </p>
        </div>
        {summary.scan && (
          <div className="rounded-md border border-stone-800 px-3 py-2 text-right text-xs text-stone-400">
            <p className="font-medium text-stone-300">Gmail {summary.scan.status}</p>
            <p>{summary.scan.totalProcessed.toLocaleString()} emails checked</p>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Staged for review" value={summary.counts.staged} href="#review" />
        <Stat label="Imported findings" value={summary.counts.imported} href="#review" />
        <Stat label="Clients in account" value={summary.counts.clients} href="/clients" />
        <Stat label="Events in account" value={summary.counts.events} href="/events" />
        <Stat label="Inquiries in account" value={summary.counts.inquiries} href="/inquiries" />
        <Stat label="Expenses in account" value={summary.counts.expenses} href="/expenses" />
        <Stat label="Ledger entries" value={summary.counts.ledgerEntries} href="/finance/ledger" />
        <Stat label="Import logs" value={summary.importLogCount} href="/import/history" />
      </div>

      {summary.byCategory.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-stone-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-900 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Pending</th>
                <th className="px-3 py-2 font-medium">Imported</th>
                <th className="px-3 py-2 font-medium">Dismissed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {summary.byCategory.map((row) => (
                <tr key={row.category} className="bg-stone-950/40">
                  <td className="px-3 py-2 capitalize text-stone-200">
                    {String(row.category).replace(/_/g, ' ')}
                  </td>
                  <td className="px-3 py-2 text-stone-400">{row.pending}</td>
                  <td className="px-3 py-2 text-stone-400">{row.imported}</td>
                  <td className="px-3 py-2 text-stone-400">{row.dismissed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
