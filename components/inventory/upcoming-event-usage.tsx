import Link from 'next/link'
import type { IngredientEventUsage } from '@/lib/inventory/stock-lookup-actions'
import { Card } from '@/components/ui/card'

/**
 * Shows which upcoming events (next 30 days) use ingredients from the inventory.
 * Displayed on the inventory hub page.
 */
export function UpcomingEventUsagePanel({
  usageMap,
  ingredientNames,
}: {
  usageMap: Map<string, IngredientEventUsage>
  ingredientNames: Map<string, string>
}) {
  // Collect all ingredients that have upcoming event usage
  const activeIngredients: Array<{
    ingredientId: string
    ingredientName: string
    events: IngredientEventUsage['events']
  }> = []

  for (const [ingredientId, usage] of usageMap) {
    if (usage.events.length > 0) {
      activeIngredients.push({
        ingredientId,
        ingredientName: ingredientNames.get(ingredientId) ?? 'Unknown',
        events: usage.events,
      })
    }
  }

  if (activeIngredients.length === 0) return null

  // Sort by number of events (most-used ingredients first)
  activeIngredients.sort((a, b) => b.events.length - a.events.length)

  // Deduplicate events across ingredients for the summary count
  const uniqueEvents = new Set<string>()
  for (const item of activeIngredients) {
    for (const e of item.events) {
      uniqueEvents.add(e.eventId)
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-stone-100">Used in Upcoming Events</h2>
        <p className="text-sm text-stone-500 mt-0.5">
          {activeIngredients.length} inventory ingredient{activeIngredients.length !== 1 ? 's' : ''}{' '}
          needed across {uniqueEvents.size} upcoming event{uniqueEvents.size !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="divide-y divide-stone-800">
        {activeIngredients.slice(0, 20).map((item) => (
          <div key={item.ingredientId} className="py-3 first:pt-0 last:pb-0">
            <p className="text-sm font-medium text-stone-100">{item.ingredientName}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {item.events.map((event) => (
                <Link
                  key={`${event.eventId}-${event.recipeId}`}
                  href={`/events/${event.eventId}`}
                  className="inline-flex items-center gap-1.5 text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 px-2 py-1 rounded-md transition-colors"
                >
                  <span className="text-stone-500">{event.eventDate}</span>
                  {event.occasion && <span>{event.occasion}</span>}
                  <span className="text-stone-600">via</span>
                  <span className="text-brand-400">{event.recipeName}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {activeIngredients.length > 20 && (
        <p className="text-xs text-stone-500">
          + {activeIngredients.length - 20} more ingredients with upcoming usage
        </p>
      )}
    </Card>
  )
}
