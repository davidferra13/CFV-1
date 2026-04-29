import Link from 'next/link'
import { AlertTriangle, Info } from 'lucide-react'
import { getEventMenuPriceConfidence } from '@/lib/quotes/price-confidence-actions'

interface Props {
  eventId: string
}

export async function QuotePriceConfidenceWarning({ eventId }: Props) {
  const confidence = await getEventMenuPriceConfidence(eventId).catch(() => null)
  if (!confidence || !confidence.hasLinkedMenu) return null

  // All menus have full costs, no warning needed.
  if (confidence.menusWithPartialCosts === 0) return null

  const allPartial = confidence.menusWithFullCosts === 0
  const Icon = allPartial ? AlertTriangle : Info
  const missingRecipeCosts = confidence.menusWithMissingRecipeCosts
  const noCostableComponents = confidence.menusWithNoCostableComponents
  const detailMessages = [
    missingRecipeCosts > 0
      ? `${missingRecipeCosts} menu${missingRecipeCosts !== 1 ? 's have' : ' has'} components without linked recipe costs.`
      : null,
    noCostableComponents > 0
      ? `${noCostableComponents} menu${noCostableComponents !== 1 ? 's have' : ' has'} no costable components yet.`
      : null,
  ].filter((message): message is string => Boolean(message))

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
        allPartial ? 'border-red-800/50 bg-red-950/30' : 'border-amber-800/50 bg-amber-950/30'
      }`}
    >
      <Icon
        aria-hidden="true"
        className={`mt-0.5 h-4 w-4 shrink-0 ${allPartial ? 'text-red-400' : 'text-amber-400'}`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${allPartial ? 'text-red-300' : 'text-amber-300'}`}>
          {allPartial
            ? 'Menu pricing is incomplete'
            : `${confidence.menusWithPartialCosts} of ${confidence.totalMenus} menu${confidence.totalMenus !== 1 ? 's have' : ' has'} incomplete pricing`}
        </p>
        <div className="mt-1 space-y-1 text-xs text-stone-500">
          {detailMessages.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-4">
              {detailMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
          <p>
            ChefFlow found {confidence.totalComponents} menu component
            {confidence.totalComponents !== 1 ? 's' : ''} across this quote. Review the menu
            costing before relying on or sending this quote.{' '}
          </p>
          <Link href="/culinary/costing/recipe" className="text-brand-400 hover:underline">
            Review unpriced recipes
          </Link>
        </div>
      </div>
    </div>
  )
}
