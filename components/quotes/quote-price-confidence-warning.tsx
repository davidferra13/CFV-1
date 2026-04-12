import Link from 'next/link'
import { getEventMenuPriceConfidence } from '@/lib/quotes/price-confidence-actions'

interface Props {
  eventId: string
}

export async function QuotePriceConfidenceWarning({ eventId }: Props) {
  const confidence = await getEventMenuPriceConfidence(eventId).catch(() => null)
  if (!confidence || !confidence.hasLinkedMenu) return null

  // All menus have full costs - no warning needed
  if (confidence.menusWithPartialCosts === 0) return null

  const allPartial = confidence.menusWithFullCosts === 0

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
        allPartial ? 'border-red-800/50 bg-red-950/30' : 'border-amber-800/50 bg-amber-950/30'
      }`}
    >
      <span className={`mt-0.5 text-sm ${allPartial ? 'text-red-400' : 'text-amber-400'}`}>
        {allPartial ? '⚠' : '△'}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${allPartial ? 'text-red-300' : 'text-amber-300'}`}>
          {allPartial
            ? 'Menu pricing is incomplete'
            : `${confidence.menusWithPartialCosts} of ${confidence.totalMenus} menu${confidence.totalMenus !== 1 ? 's have' : ' has'} incomplete pricing`}
        </p>
        <p className="text-xs text-stone-500 mt-0.5">
          This quote may not reflect your true ingredient costs.{' '}
          <Link href="/culinary/costing/recipe" className="text-brand-400 hover:underline">
            Review unpriced recipes
          </Link>
        </p>
      </div>
    </div>
  )
}
