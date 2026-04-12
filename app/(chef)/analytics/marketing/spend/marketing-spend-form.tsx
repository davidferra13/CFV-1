'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logMarketingSpend } from '@/lib/analytics/marketing-spend-actions'
import { CHANNEL_LABELS } from '@/lib/analytics/marketing-spend-constants'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

export function MarketingSpendForm() {
  const router = useRouter()
  const [amountStr, setAmountStr] = useState('')
  const [channel, setChannel] = useState<string>('facebook_ads')
  const [description, setDescription] = useState('')
  const [spentAt, setSpentAt] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const dollars = parseFloat(amountStr)
    if (isNaN(dollars) || dollars <= 0) {
      setError('Enter a valid amount')
      return
    }

    setLoading(true)
    setError(null)

    const result = await logMarketingSpend({
      amount_cents: Math.round(dollars * 100),
      channel,
      description: description || undefined,
      spend_date: spentAt,
    })

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setAmountStr('')
    setDescription('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <Alert variant="error">{error}</Alert>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Amount */}
        <div>
          <label className="text-xs font-medium text-stone-500 block mb-1">Amount ($)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0.00"
            required
            className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Channel */}
        <div>
          <label className="text-xs font-medium text-stone-500 block mb-1">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            title="Marketing channel"
            className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="text-xs font-medium text-stone-500 block mb-1">Date</label>
          <input
            type="date"
            value={spentAt}
            onChange={(e) => setSpentAt(e.target.value)}
            required
            title="Date of spend"
            className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-stone-500 block mb-1">Note (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Spring promo campaign"
            className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={loading || !amountStr}>
          {loading ? 'Saving...' : 'Log Spend'}
        </Button>
      </div>
    </form>
  )
}
