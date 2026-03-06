// Grocery/Prep Shopping Window Widget
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import type { ShoppingWindowItem } from '@/lib/dashboard/widget-actions'

interface Props {
  items: ShoppingWindowItem[]
}

export function ShoppingWindowWidget({ items }: Props) {
  if (items.length === 0) return null

  const needsShopping = items.filter((i) => !i.hasGroceryList)
  const ready = items.filter((i) => i.hasGroceryList)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-100">Shopping Window</h3>
        <span className="text-xs text-stone-500">Next 3 days</span>
      </div>

      {needsShopping.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-amber-400 font-medium mb-1.5">
            {needsShopping.length} event{needsShopping.length !== 1 ? 's' : ''} need grocery lists
          </p>
          <div className="space-y-1.5">
            {needsShopping.map((item) => (
              <Link
                key={item.eventId}
                href={`/events/${item.eventId}`}
                className="flex items-center justify-between hover:bg-stone-800 rounded-md px-1 py-1 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-100 truncate">{item.occasion}</p>
                  <p className="text-xs text-stone-500">
                    {item.clientName} ·{' '}
                    {format(new Date(item.eventDate + 'T00:00:00'), 'EEE, MMM d')}
                  </p>
                </div>
                <span className="text-xs font-semibold text-amber-500 shrink-0 ml-3">
                  {item.daysUntil === 0
                    ? 'Today'
                    : item.daysUntil === 1
                      ? 'Tomorrow'
                      : `${item.daysUntil}d`}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {ready.length > 0 && (
        <div>
          <p className="text-xs text-green-400 font-medium mb-1.5">
            {ready.length} event{ready.length !== 1 ? 's' : ''} ready to shop
          </p>
          <div className="space-y-1.5">
            {ready.map((item) => (
              <Link
                key={item.eventId}
                href={`/events/${item.eventId}`}
                className="flex items-center justify-between hover:bg-stone-800 rounded-md px-1 py-1 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-stone-300 truncate">{item.occasion}</p>
                  <p className="text-xs text-stone-500">
                    {format(new Date(item.eventDate + 'T00:00:00'), 'EEE, MMM d')}
                  </p>
                </div>
                <span className="text-xs text-green-500 shrink-0 ml-3">List ready</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
