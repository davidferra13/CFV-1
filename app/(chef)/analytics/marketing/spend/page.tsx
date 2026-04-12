import { requireChef } from '@/lib/auth/get-user'
import { getMarketingSpend, CHANNEL_LABELS } from '@/lib/analytics/marketing-spend-actions'
import { MarketingSpendForm } from './marketing-spend-form'
import { MarketingSpendTable } from './marketing-spend-table'
import { formatCurrency } from '@/lib/utils/currency'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Marketing Spend' }

export default async function MarketingSpendPage() {
  await requireChef()

  const { data: entries, error } = await getMarketingSpend()

  const totalCents = (entries ?? []).reduce((sum, e) => sum + e.amount_cents, 0)

  const byChannel: Record<string, number> = {}
  for (const entry of entries ?? []) {
    byChannel[entry.channel] = (byChannel[entry.channel] ?? 0) + entry.amount_cents
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/analytics"
            className="text-xs text-brand-500 hover:text-brand-400 mb-1 inline-block"
          >
            ← Analytics
          </Link>
          <h1 className="text-2xl font-bold text-stone-100">Marketing Spend</h1>
          <p className="text-stone-400 text-sm mt-1">
            Log what you spend on ads, flyers, referral bonuses, and sponsorships. Used to compute
            your cost per client (CAC).
          </p>
        </div>
        {totalCents > 0 && (
          <div className="text-right">
            <p className="text-xs text-stone-500">Total logged</p>
            <p className="text-2xl font-bold text-stone-100">{formatCurrency(totalCents)}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/50 px-4 py-3 text-sm text-amber-300">
          Could not load spend data. {error}
        </div>
      )}

      {/* Log new spend */}
      <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-5">
        <h2 className="text-sm font-semibold text-stone-200 mb-4">Log New Spend</h2>
        <MarketingSpendForm />
      </div>

      {/* By channel summary */}
      {Object.keys(byChannel).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-400 mb-3">By Channel</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(byChannel)
              .sort(([, a], [, b]) => b - a)
              .map(([channel, cents]) => (
                <div key={channel} className="rounded-lg border border-stone-700 bg-stone-900 p-3">
                  <p className="text-xs text-stone-500">
                    {CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS] ?? channel}
                  </p>
                  <p className="text-lg font-semibold text-stone-100 mt-0.5">
                    {formatCurrency(cents)}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {totalCents > 0 ? `${Math.round((cents / totalCents) * 100)}%` : ''}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* All entries */}
      <MarketingSpendTable entries={entries ?? []} />
    </div>
  )
}
