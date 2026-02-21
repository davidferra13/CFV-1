'use client'

// AvailableLeftovers — Shows reusable carry-forward inventory from other recent events.
// Lets the chef click "Use in this event" to allocate a leftover to the current event,
// which sets transferred_to_event_id via the transferUnusedToEvent server action.
// Only shown when there are unallocated leftovers available.

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { transferUnusedToEvent } from '@/lib/expenses/unused'
import { formatCurrency } from '@/lib/utils/currency'
import { format, differenceInDays, parseISO } from 'date-fns'
import type { CarryForwardItem } from '@/lib/events/carry-forward'

type Props = {
  eventId: string
  items: CarryForwardItem[]
}

export function AvailableLeftovers({ eventId, items: initialItems }: Props) {
  const [items, setItems] = useState(initialItems)
  const [transferring, setTransferring] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  if (items.length === 0) return null

  function handleUse(itemId: string) {
    setTransferring(itemId)
    startTransition(async () => {
      try {
        await transferUnusedToEvent(itemId, eventId)
        // Remove from list after successful transfer
        setItems((prev) => prev.filter((i) => i.id !== itemId))
      } catch (err) {
        console.error('[AvailableLeftovers] Transfer error:', err)
      } finally {
        setTransferring(null)
      }
    })
  }

  return (
    <Card className="border-green-200 bg-green-50/40">
      <CardHeader>
        <CardTitle className="text-base text-green-900">
          Available Carry-Forward ({items.length})
        </CardTitle>
        <p className="text-xs text-green-700 -mt-1">
          Reusable leftovers from previous events — click to apply to this one
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 py-2 border-b border-green-100 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-stone-900 truncate">{item.ingredientName}</p>
                  {item.useByDate && (() => {
                    const daysLeft = differenceInDays(parseISO(item.useByDate!), new Date())
                    if (daysLeft < 0) return <span className="text-xs text-red-600 font-medium">past use-by</span>
                    if (daysLeft <= 3) return <span className="text-xs text-amber-600 font-medium">use within {daysLeft}d</span>
                    return null
                  })()}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <span className="text-xs text-stone-500">
                    From:{' '}
                    <span className="font-medium text-stone-700">
                      {item.sourceEventOccasion ?? 'Event'}
                    </span>{' '}
                    ({item.sourceEventDate
                      ? format(new Date(item.sourceEventDate), 'MMM d')
                      : 'recent'})
                  </span>
                  {item.estimatedCostCents && (
                    <span className="text-xs text-green-700 font-medium">
                      ~{formatCurrency(item.estimatedCostCents)} saved
                    </span>
                  )}
                </div>
                {item.storageLocation && (
                  <p className="text-xs text-stone-500 mt-0.5">Stored: {item.storageLocation}</p>
                )}
                {item.notes && (
                  <p className="text-xs text-stone-500 mt-0.5 truncate">{item.notes}</p>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleUse(item.id)}
                disabled={transferring === item.id}
                className="flex-shrink-0"
              >
                {transferring === item.id ? 'Applying...' : 'Use Here'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
