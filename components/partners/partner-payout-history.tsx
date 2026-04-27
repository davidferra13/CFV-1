import { type PartnerPayoutSummary } from '@/lib/partners/portal-actions'
import { format } from 'date-fns'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  check: { label: 'Check', className: 'bg-emerald-900 text-emerald-300' },
  venmo: { label: 'Venmo', className: 'bg-blue-900 text-blue-300' },
  zelle: { label: 'Zelle', className: 'bg-violet-900 text-violet-300' },
  bank_transfer: { label: 'Bank Transfer', className: 'bg-sky-900 text-sky-300' },
  cash: { label: 'Cash', className: 'bg-amber-900 text-amber-300' },
  paypal: { label: 'PayPal', className: 'bg-indigo-900 text-indigo-300' },
  other: { label: 'Other', className: 'bg-stone-700 text-stone-300' },
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function MethodBadge({ method }: { method: string }) {
  const badge = STATUS_BADGE[method] ?? STATUS_BADGE.other
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
    >
      {badge.label}
    </span>
  )
}

export function PartnerPayoutHistory({ data }: { data: PartnerPayoutSummary }) {
  const { payouts, totalPaidCents } = data

  if (payouts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-600 bg-stone-900 p-8 text-center">
        <p className="text-sm text-stone-400">No payouts recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-stone-400">
          {payouts.length} payout{payouts.length === 1 ? '' : 's'} recorded
        </p>
        <p className="text-lg font-semibold text-stone-100">
          {formatCents(totalPaidCents)} total
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-800 border-b border-stone-700">
            <tr>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">Date</th>
              <th className="text-right px-4 py-3 text-stone-500 font-medium">Amount</th>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">Method</th>
              <th className="text-left px-4 py-3 text-stone-500 font-medium hidden sm:table-cell">
                Reference
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {payouts.map((payout) => (
              <tr key={payout.id} className="hover:bg-stone-800">
                <td className="px-4 py-3 text-stone-300">
                  {format(new Date(payout.paid_on), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3 text-right text-stone-100 font-medium tabular-nums">
                  {formatCents(payout.amount_cents)}
                </td>
                <td className="px-4 py-3">
                  <MethodBadge method={payout.method} />
                </td>
                <td className="px-4 py-3 text-stone-500 hidden sm:table-cell">
                  {payout.reference ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
