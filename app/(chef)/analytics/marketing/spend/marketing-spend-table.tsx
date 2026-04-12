'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMarketingSpend } from '@/lib/analytics/marketing-spend-actions'
import { CHANNEL_LABELS } from '@/lib/analytics/marketing-spend-constants'
import type { MarketingSpendEntry } from '@/lib/analytics/marketing-spend-constants'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

interface MarketingSpendTableProps {
  entries: MarketingSpendEntry[]
}

export function MarketingSpendTable({ entries }: MarketingSpendTableProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (entries.length === 0) {
    return (
      <div className="text-center py-10 text-stone-500 text-sm">
        No spend logged yet. Add your first entry above.
      </div>
    )
  }

  function handleDelete(id: string) {
    setDeleting(id)
    setError(null)
    startTransition(async () => {
      try {
        const result = await deleteMarketingSpend(id)
        if (result.error) {
          setError(result.error)
        } else {
          router.refresh()
        }
      } catch {
        setError('Failed to delete')
      } finally {
        setDeleting(null)
      }
    })
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-stone-400 mb-3">All Entries</h2>
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
      <div className="rounded-xl border border-stone-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700 bg-stone-900/60">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">Channel</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-stone-500">Note</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-stone-500">Amount</th>
              <th className="px-4 py-2.5" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-stone-900/40 transition-colors">
                <td className="px-4 py-2.5 text-stone-300 whitespace-nowrap">
                  {format(new Date(entry.spend_date), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-2.5 text-stone-300">
                  {CHANNEL_LABELS[entry.channel as keyof typeof CHANNEL_LABELS] ?? entry.channel}
                </td>
                <td className="px-4 py-2.5 text-stone-400 text-xs">{entry.description ?? ''}</td>
                <td className="px-4 py-2.5 text-right font-medium text-stone-100">
                  {formatCurrency(entry.amount_cents)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleting === entry.id}
                    className="text-xs text-stone-500 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {deleting === entry.id ? 'Deleting...' : 'Remove'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
