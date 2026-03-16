// IncentiveRedemptionHistory - Chef view of all code redemptions in their tenant
// Shows who redeemed what, when, against which event, and how much was applied.

import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import type { IncentiveRedemptionRecord } from '@/lib/loyalty/voucher-actions'

type Props = {
  redemptions: IncentiveRedemptionRecord[]
}

export function IncentiveRedemptionHistory({ redemptions }: Props) {
  if (redemptions.length === 0) {
    return (
      <p className="text-sm text-stone-500 py-6 text-center">
        No redemptions yet. Codes appear here when clients apply them at checkout.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-700">
            <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
              Date
            </th>
            <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
              Code
            </th>
            <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
              Client
            </th>
            <th className="text-left py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
              Event
            </th>
            <th className="text-right py-3 pr-4 font-medium text-stone-500 text-xs uppercase tracking-wide">
              Applied
            </th>
            <th className="text-right py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">
              Balance After
            </th>
          </tr>
        </thead>
        <tbody>
          {redemptions.map((r) => (
            <tr key={r.id} className="border-b border-stone-800 hover:bg-stone-800">
              <td className="py-3 pr-4 text-stone-400 whitespace-nowrap">
                {format(new Date(r.redeemed_at), 'MMM d, yyyy')}
              </td>
              <td className="py-3 pr-4">
                <span className="font-mono text-xs bg-stone-800 px-2 py-0.5 rounded text-stone-200">
                  {r.code}
                </span>
                <span className="ml-2 text-xs text-stone-400 capitalize">
                  {r.type.replace('_', ' ')}
                </span>
              </td>
              <td className="py-3 pr-4 text-stone-300">
                {r.client?.full_name || <span className="text-stone-400">Unknown</span>}
              </td>
              <td className="py-3 pr-4 text-stone-300">
                {r.event?.occasion || <span className="text-stone-400">-</span>}
              </td>
              <td className="py-3 pr-4 text-right font-medium text-green-700">
                −{formatCurrency(r.applied_amount_cents)}
              </td>
              <td className="py-3 text-right text-stone-400">
                {r.balance_after_cents != null ? (
                  formatCurrency(r.balance_after_cents)
                ) : (
                  <span className="text-stone-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
