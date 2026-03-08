// Admin Quotes — All quotes/invoices across every chef

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminQuotes } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { Receipt } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

function formatCents(cents: number | null): string {
  if (!cents) return '-'
  return (
    '$' +
    (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
  )
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-800 text-stone-400',
  sent: 'bg-blue-900 text-blue-700',
  accepted: 'bg-green-900 text-green-700',
  declined: 'bg-red-900 text-red-700',
  expired: 'bg-stone-800 text-stone-500',
}

export default async function AdminQuotesPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const quotes = await getAdminQuotes().catch(() => [])
  const totalValue = quotes.reduce((s, q) => s + (q.total_cents ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-950 rounded-lg">
          <Receipt size={18} className="text-indigo-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Quotes</h1>
          <p className="text-sm text-stone-500">
            {quotes.length} quote{quotes.length !== 1 ? 's' : ''} · {formatCents(totalValue)} total
            value
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={quotes}
          filename="admin-quotes"
          columns={[
            { header: 'Chef', accessor: (q) => q.chefBusinessName },
            { header: 'Event', accessor: (q) => q.eventOccasion },
            { header: 'Status', accessor: (q) => q.status },
            {
              header: 'Total ($)',
              accessor: (q) => (q.total_cents ? (q.total_cents / 100).toFixed(2) : ''),
            },
            { header: 'Created', accessor: (q) => q.created_at },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {quotes.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No quotes found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Event
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Created
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {quote.chefBusinessName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {quote.eventOccasion ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[quote.status ?? ''] ?? 'bg-stone-800 text-stone-400'}`}
                      >
                        {quote.status ?? 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatCents(quote.total_cents)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(quote.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ViewAsChefButton chefId={quote.tenant_id} />
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
