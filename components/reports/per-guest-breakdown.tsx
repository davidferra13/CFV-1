// Per-Guest Cost Breakdown

import type { PerGuestBreakdown } from '@/lib/reports/event-cost-report'

interface PerGuestBreakdownProps {
  data: PerGuestBreakdown | null
  guestCount: number | null
}

function cents(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  return `${sign}$${(abs / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function PerGuestBreakdownSection({ data, guestCount }: PerGuestBreakdownProps) {
  if (!data || !guestCount) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-stone-200 mb-3 print:text-stone-800">
          Per-Guest Breakdown
        </h2>
        <p className="text-stone-400 print:text-stone-500 text-sm">
          Guest count not set. Add guest count to the event to see per-guest costs.
        </p>
      </div>
    )
  }

  const items = [
    { label: 'Revenue per guest', value: data.revenuePerGuest },
    { label: 'Total cost per guest', value: data.totalCostPerGuest },
    { label: 'Ingredient cost per guest', value: data.ingredientCostPerGuest },
    { label: 'Profit per guest', value: data.profitPerGuest },
  ]

  return (
    <div>
      <h2 className="text-lg font-semibold text-stone-200 mb-3 print:text-stone-800">
        Per-Guest Breakdown
        <span className="text-sm font-normal text-stone-400 print:text-stone-500 ml-2">
          ({guestCount} guests)
        </span>
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-stone-700 p-3 print:border-stone-300"
          >
            <p className="text-xs text-stone-400 print:text-stone-500">{item.label}</p>
            <p
              className={`mt-1 text-lg font-semibold ${
                item.label === 'Profit per guest'
                  ? item.value >= 0
                    ? 'text-green-400 print:text-green-600'
                    : 'text-red-400 print:text-red-600'
                  : 'text-stone-200 print:text-stone-800'
              }`}
            >
              {cents(item.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
