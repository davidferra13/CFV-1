// Travel Ingredients Panel
// Shows ingredients organized by travel leg and stop for an event.
// Designed for embedding on event detail or packing list pages.
'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTravelLegIngredients } from '@/lib/events/travel-ingredients-actions'
import type { TravelIngredientsResult, TravelIngredientItem } from '@/lib/events/travel-ingredients-actions'
import { LEG_TYPE_LABELS } from '@/lib/travel/types'

interface TravelIngredientsPanelProps {
  eventId: string
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  to_source: 'warning',
  sourced: 'success',
  unavailable: 'error',
}

const STATUS_LABEL: Record<string, string> = {
  to_source: 'To Source',
  sourced: 'Sourced',
  unavailable: 'Unavailable',
}

function IngredientRow({ item }: { item: TravelIngredientItem }) {
  const qty = item.quantity != null ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : null

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900">{item.ingredientName}</span>
        {qty && <span className="text-gray-500">({qty})</span>}
        {item.notes && <span className="text-xs text-gray-400">{item.notes}</span>}
      </div>
      <Badge variant={STATUS_BADGE[item.status] ?? 'default'}>
        {STATUS_LABEL[item.status] ?? item.status}
      </Badge>
    </div>
  )
}

export function TravelIngredientsPanel({ eventId }: TravelIngredientsPanelProps) {
  const [data, setData] = useState<TravelIngredientsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getTravelLegIngredients(eventId)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load travel ingredients')
      }
    })
  }, [eventId])

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    )
  }

  if (isPending || !data) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-gray-500">
          Loading travel ingredients...
        </CardContent>
      </Card>
    )
  }

  if (data.legs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Travel Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            No travel legs planned for this event yet. Add travel legs to see ingredient sourcing here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Travel Ingredients</CardTitle>
          <div className="flex gap-2 text-xs">
            <Badge variant="success">{data.sourcedCount} sourced</Badge>
            <Badge variant="warning">{data.toSourceCount} to source</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.legs.map((leg) => {
          const hasIngredients =
            leg.stops.some((s) => s.ingredients.length > 0) ||
            leg.unassignedIngredients.length > 0

          if (!hasIngredients) return null

          return (
            <div key={leg.legId} className="space-y-2">
              {/* Leg header */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {LEG_TYPE_LABELS[leg.legType]}
                </span>
                <span className="text-xs text-gray-500">{leg.legDate}</span>
                {leg.departureTime && (
                  <span className="text-xs text-gray-400">at {leg.departureTime}</span>
                )}
              </div>

              {/* Stops with ingredients */}
              {leg.stops
                .filter((s) => s.ingredients.length > 0)
                .map((stop) => (
                  <div
                    key={`${leg.legId}-stop-${stop.order}`}
                    className="ml-3 border-l-2 border-gray-200 pl-3"
                  >
                    <p className="text-sm font-medium text-gray-700">
                      {stop.name}
                      {stop.address && (
                        <span className="ml-1 text-xs font-normal text-gray-400">
                          {stop.address}
                        </span>
                      )}
                    </p>
                    <div className="mt-1 divide-y divide-gray-100">
                      {stop.ingredients.map((item) => (
                        <IngredientRow key={item.ingredientId} item={item} />
                      ))}
                    </div>
                  </div>
                ))}

              {/* Unassigned ingredients (not matched to a stop) */}
              {leg.unassignedIngredients.length > 0 && (
                <div className="ml-3 border-l-2 border-dashed border-gray-200 pl-3">
                  <p className="text-sm font-medium text-gray-500">Other items</p>
                  <div className="mt-1 divide-y divide-gray-100">
                    {leg.unassignedIngredients.map((item) => (
                      <IngredientRow key={item.ingredientId} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
