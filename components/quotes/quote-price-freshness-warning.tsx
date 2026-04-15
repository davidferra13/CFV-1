import { getQuotePriceFreshnessSummary } from '@/lib/quotes/price-confidence-actions'

interface Props {
  eventId: string
}

export async function QuotePriceFreshnessWarning({ eventId }: Props) {
  const summary = await getQuotePriceFreshnessSummary(eventId).catch(() => null)

  if (!summary || !summary.hasLinkedMenu || summary.totalIngredients === 0) return null
  if (summary.staleCount === 0 && summary.noPriceCount === 0) return null

  const allStale = summary.recentCount === 0 && summary.currentCount === 0
  const hasNoPrice = summary.noPriceCount > 0
  const hasStale = summary.staleCount > 0

  // Build a plain-language summary of what's wrong
  const parts: string[] = []
  if (hasStale) {
    const ageNote = summary.oldestPriceDays !== null ? ` (oldest: ${summary.oldestPriceDays}d)` : ''
    parts.push(
      `${summary.staleCount} ingredient${summary.staleCount !== 1 ? 's' : ''} with prices older than 30 days${ageNote}`
    )
  }
  if (hasNoPrice) {
    parts.push(
      `${summary.noPriceCount} ingredient${summary.noPriceCount !== 1 ? 's' : ''} with no price data`
    )
  }

  const severity = allStale || (hasNoPrice && hasStale) ? 'high' : 'medium'

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
        severity === 'high'
          ? 'border-red-800/50 bg-red-950/30'
          : 'border-amber-800/50 bg-amber-950/30'
      }`}
    >
      <span className={`mt-0.5 text-sm ${severity === 'high' ? 'text-red-400' : 'text-amber-400'}`}>
        {severity === 'high' ? '⚠' : '△'}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${severity === 'high' ? 'text-red-300' : 'text-amber-300'}`}
        >
          Ingredient prices may not reflect current market rates
        </p>
        <ul className="mt-1 space-y-0.5">
          {parts.map((part) => (
            <li key={part} className="text-xs text-stone-500">
              {part}
            </li>
          ))}
        </ul>
        <p className="text-xs text-stone-600 mt-1">
          Log recent receipts or check the price catalog to update before sending this quote.
        </p>
      </div>
    </div>
  )
}
