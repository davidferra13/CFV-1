'use client'

// Travel Plan Client
// Interactive view of all travel legs for an event.
// Shows the full arc: specialty sourcing → grocery → service → return.

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  markLegComplete,
  markLegInProgress,
  cancelTravelLeg,
  deleteTravelLeg,
  updateIngredientStatus,
} from '@/lib/travel/actions'
import { TravelLegForm } from './travel-leg-form'
import type {
  TravelPlan,
  TravelLeg,
  TravelLegWithIngredients,
  TravelIngredientStatus,
} from '@/lib/travel/types'
import {
  LEG_TYPE_LABELS,
  LEG_STATUS_LABELS,
  INGREDIENT_STATUS_LABELS,
  formatLegTime,
  formatMinutes,
} from '@/lib/travel/types'

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  plan: TravelPlan
  eventDate: string
  prefillVenueAddress?: string
  prefillHomeAddress?: string
}

// ─── Status badge variant mapping ────────────────────────────────────────────

function legStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'completed':
      return 'success'
    case 'in_progress':
      return 'warning'
    case 'cancelled':
      return 'error'
    default:
      return 'default'
  }
}

function legTypeBadgeVariant(type: string): 'default' | 'info' | 'warning' {
  switch (type) {
    case 'specialty_sourcing':
      return 'warning'
    case 'service_travel':
      return 'info'
    case 'return_home':
      return 'info'
    default:
      return 'default'
  }
}

// ─── Ingredient row ───────────────────────────────────────────────────────────

function IngredientStatusRow({
  ingredient,
  onStatusChange,
}: {
  ingredient: TravelLegWithIngredients['ingredients'][0]
  onStatusChange: (id: string, status: TravelIngredientStatus) => void
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-stone-800 last:border-0">
      <div className="flex items-start gap-2">
        <div
          className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            ingredient.status === 'sourced'
              ? 'bg-green-500 border-green-500'
              : ingredient.status === 'unavailable'
                ? 'bg-red-200 border-red-300'
                : 'border-stone-600'
          }`}
        >
          {ingredient.status === 'sourced' && (
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={4}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div>
          <p
            className={`text-sm font-medium ${ingredient.status === 'sourced' ? 'line-through text-stone-300' : 'text-stone-200'}`}
          >
            {ingredient.ingredient_name ?? 'Ingredient'}
          </p>
          <div className="flex gap-2 text-xs text-stone-300 mt-0.5">
            {ingredient.quantity && (
              <span>
                {ingredient.quantity} {ingredient.unit ?? ''}
              </span>
            )}
            {ingredient.store_name && <span>@ {ingredient.store_name}</span>}
            {ingredient.notes && <span className="italic">{ingredient.notes}</span>}
          </div>
        </div>
      </div>
      <select
        value={ingredient.status}
        onChange={(e) => onStatusChange(ingredient.id, e.target.value as TravelIngredientStatus)}
        className="text-xs border border-stone-700 rounded px-1.5 py-1 bg-stone-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        <option value="to_source">To Source</option>
        <option value="sourced">Sourced ✓</option>
        <option value="unavailable">Unavailable</option>
      </select>
    </div>
  )
}

// ─── Leg Card ────────────────────────────────────────────────────────────────

function LegCard({
  leg,
  onEdit,
  onDelete,
  onStatusChange,
  onIngredientStatusChange,
}: {
  leg: TravelLegWithIngredients
  onEdit: (leg: TravelLegWithIngredients) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
  onIngredientStatusChange: (ingredientId: string, status: TravelIngredientStatus) => void
}) {
  const [expanded, setExpanded] = useState(leg.status !== 'completed' && leg.status !== 'cancelled')

  const hasStops = leg.stops.length > 0
  const hasIngredients = leg.ingredients.length > 0

  return (
    <Card className="overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-start justify-between p-4 text-left hover:bg-stone-800 transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Date bubble */}
          <div className="flex-shrink-0 text-center bg-stone-800 rounded-lg px-2 py-1 min-w-[48px]">
            <p className="text-xs font-semibold text-stone-500">
              {new Date(leg.leg_date).toLocaleDateString('en-US', { month: 'short' })}
            </p>
            <p className="text-lg font-bold text-stone-200 leading-none">
              {new Date(leg.leg_date).getDate()}
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-stone-100">
                {LEG_TYPE_LABELS[leg.leg_type]}
              </span>
              <Badge variant={legTypeBadgeVariant(leg.leg_type)}>
                {leg.leg_type.replace('_', ' ')}
              </Badge>
              <Badge variant={legStatusVariant(leg.status)}>{LEG_STATUS_LABELS[leg.status]}</Badge>
              {leg.linked_event_ids.length > 0 && (
                <Badge variant="info">Shared · {leg.linked_event_ids.length + 1} events</Badge>
              )}
            </div>

            <div className="flex gap-3 mt-1 text-xs text-stone-500">
              {leg.departure_time && <span>Depart: {formatLegTime(leg.departure_time)}</span>}
              {leg.total_estimated_minutes && (
                <span>~{formatMinutes(leg.total_estimated_minutes)}</span>
              )}
              {hasStops && (
                <span>
                  {leg.stops.length} stop{leg.stops.length !== 1 ? 's' : ''}
                </span>
              )}
              {hasIngredients && (
                <span>
                  {leg.ingredients.filter((i) => i.status === 'sourced').length}/
                  {leg.ingredients.length} sourced
                </span>
              )}
            </div>

            {/* Origin → Destination summary */}
            {(leg.origin_label || leg.destination_label) && (
              <p className="text-xs text-stone-300 mt-0.5">
                {leg.origin_label || 'Origin'}
                {' → '}
                {leg.destination_label || 'Destination'}
              </p>
            )}
          </div>
        </div>

        <span className="text-stone-300 text-sm ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-stone-800 space-y-4">
          {/* Route */}
          {(leg.origin_address || leg.destination_address || hasStops) && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                Route
              </p>
              <div className="space-y-1">
                {/* Origin */}
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-900 text-green-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    A
                  </span>
                  <div>
                    <p className="text-sm font-medium text-stone-200">
                      {leg.origin_label || 'Origin'}
                    </p>
                    {leg.origin_address && (
                      <p className="text-xs text-stone-300">{leg.origin_address}</p>
                    )}
                  </div>
                </div>

                {/* Stops */}
                {leg.stops.map((stop, i) => (
                  <div key={i} className="flex items-start gap-2 ml-2.5">
                    <div className="flex flex-col items-center">
                      <div className="w-px h-3 bg-stone-300" />
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-800 text-stone-300 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                    <div className="ml-1">
                      <p className="text-sm font-medium text-stone-200">{stop.name}</p>
                      {stop.address && <p className="text-xs text-stone-300">{stop.address}</p>}
                      {stop.purpose && (
                        <p className="text-xs text-brand-600 italic">{stop.purpose}</p>
                      )}
                      <div className="flex gap-2 text-xs text-stone-300 mt-0.5">
                        {stop.estimated_minutes > 0 && (
                          <span>{formatMinutes(stop.estimated_minutes)} on-site</span>
                        )}
                        {stop.notes && <span className="italic">{stop.notes}</span>}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Destination */}
                {(leg.destination_label || leg.destination_address) && (
                  <div className="flex items-start gap-2 ml-2.5">
                    <div className="flex flex-col items-center">
                      <div className="w-px h-3 bg-stone-300" />
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-900 text-red-700 text-xs font-bold flex items-center justify-center">
                        Z
                      </span>
                    </div>
                    <div className="ml-1">
                      <p className="text-sm font-medium text-stone-200">
                        {leg.destination_label || 'Destination'}
                      </p>
                      {leg.destination_address && (
                        <p className="text-xs text-stone-300">{leg.destination_address}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Time totals */}
              {(leg.total_drive_minutes || leg.total_stop_minutes) && (
                <div className="flex gap-4 mt-2 text-xs text-stone-500 bg-stone-800 rounded px-3 py-1.5">
                  {leg.total_drive_minutes && (
                    <span>Drive: {formatMinutes(leg.total_drive_minutes)}</span>
                  )}
                  {leg.total_stop_minutes && (
                    <span>Stops: {formatMinutes(leg.total_stop_minutes)}</span>
                  )}
                  {leg.total_estimated_minutes && (
                    <span className="font-medium">
                      Total: {formatMinutes(leg.total_estimated_minutes)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ingredients (specialty sourcing) */}
          {hasIngredients && (
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                Ingredients to source
              </p>
              <div className="divide-y divide-stone-800">
                {leg.ingredients.map((ing) => (
                  <IngredientStatusRow
                    key={ing.id}
                    ingredient={ing}
                    onStatusChange={onIngredientStatusChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {leg.purpose_notes && (
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                Notes
              </p>
              <p className="text-sm text-stone-300 whitespace-pre-wrap">{leg.purpose_notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-800">
            {leg.status === 'planned' && (
              <Button size="sm" onClick={() => onStatusChange(leg.id, 'in_progress')}>
                Start trip
              </Button>
            )}
            {leg.status === 'in_progress' && (
              <Button size="sm" onClick={() => onStatusChange(leg.id, 'completed')}>
                Mark complete
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => onEdit(leg)}>
              Edit
            </Button>
            {leg.status !== 'cancelled' && leg.status !== 'completed' && (
              <Button size="sm" variant="ghost" onClick={() => onStatusChange(leg.id, 'cancelled')}>
                Cancel trip
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                if (confirm('Delete this travel leg? This cannot be undone.')) {
                  onDelete(leg.id)
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-12 space-y-3">
      <div className="text-4xl">🗺️</div>
      <h3 className="text-lg font-semibold text-stone-300">No travel legs planned yet</h3>
      <p className="text-sm text-stone-500 max-w-sm mx-auto">
        Plan your full route — specialty sourcing, grocery runs, travel to venue, and return home.
      </p>
      <Button onClick={onAdd}>Plan first trip</Button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TravelPlanClient({
  plan,
  eventDate,
  prefillVenueAddress,
  prefillHomeAddress,
}: Props) {
  const [legs, setLegs] = useState<TravelLegWithIngredients[]>(plan.legs)
  const [editingLeg, setEditingLeg] = useState<TravelLegWithIngredients | null | undefined>(
    undefined // undefined = not showing form; null = adding new
  )
  const [isPending, startTransition] = useTransition()

  const isFormOpen = editingLeg !== undefined

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleSave = (savedLeg: TravelLeg) => {
    setLegs((prev) => {
      const exists = prev.find((l) => l.id === savedLeg.id)
      if (exists) {
        return prev.map((l) => (l.id === savedLeg.id ? { ...l, ...savedLeg } : l))
      }
      // New leg: add with empty ingredients
      return [
        ...prev,
        { ...savedLeg, ingredients: [], linked_event_ids: savedLeg.linked_event_ids ?? [] },
      ].sort(
        (a, b) =>
          a.leg_date.localeCompare(b.leg_date) ||
          (a.departure_time ?? '').localeCompare(b.departure_time ?? '')
      )
    })
    setEditingLeg(undefined)
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteTravelLeg(id)
      setLegs((prev) => prev.filter((l) => l.id !== id))
    })
  }

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      if (status === 'completed') await markLegComplete(id)
      else if (status === 'in_progress') await markLegInProgress(id)
      else if (status === 'cancelled') await cancelTravelLeg(id)

      setLegs((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                status: status as TravelLeg['status'],
                completed_at: status === 'completed' ? new Date().toISOString() : l.completed_at,
              }
            : l
        )
      )
    })
  }

  const handleIngredientStatusChange = (ingredientId: string, status: TravelIngredientStatus) => {
    startTransition(async () => {
      await updateIngredientStatus(ingredientId, status)
      setLegs((prev) =>
        prev.map((leg) => ({
          ...leg,
          ingredients: leg.ingredients.map((ing) =>
            ing.id === ingredientId
              ? {
                  ...ing,
                  status,
                  sourced_at: status === 'sourced' ? new Date().toISOString() : null,
                }
              : ing
          ),
        }))
      )
    })
  }

  // ─── Sort & group legs by status ─────────────────────────────────────────

  const activeLegs = legs.filter((l) => l.status !== 'cancelled' && l.status !== 'completed')
  const completedLegs = legs.filter((l) => l.status === 'completed')
  const cancelledLegs = legs.filter((l) => l.status === 'cancelled')

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Travel Plan</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            All trips from first sourcing run to return home after service
          </p>
        </div>
        <div className="flex gap-2">
          {!isFormOpen && <Button onClick={() => setEditingLeg(null)}>+ Add trip</Button>}
        </div>
      </div>

      {/* Nearby events (consolidation suggestion) */}
      {!isFormOpen && plan.nearbyEvents.length > 0 && (
        <div className="bg-amber-950 border border-amber-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-amber-800">
            You have {plan.nearbyEvents.length} other event
            {plan.nearbyEvents.length !== 1 ? 's' : ''} this week:
          </p>
          <ul className="mt-1 space-y-0.5">
            {plan.nearbyEvents.map((evt) => (
              <li key={evt.id} className="text-amber-700 text-xs">
                • {evt.occasion || 'Untitled'} on{' '}
                {new Date(evt.event_date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
                {evt.client_name && ` (${evt.client_name})`}
              </li>
            ))}
          </ul>
          <p className="text-amber-600 text-xs mt-1">
            Consider adding a Consolidated Shopping run to cover multiple events in one trip.
          </p>
        </div>
      )}

      {/* Add/Edit form */}
      {isFormOpen && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-stone-300 mb-4">
            {editingLeg ? 'Edit trip' : 'Plan a new trip'}
          </h3>
          <TravelLegForm
            eventId={plan.eventId}
            eventDate={eventDate}
            leg={editingLeg ?? null}
            prefillVenueAddress={prefillVenueAddress}
            prefillHomeAddress={prefillHomeAddress}
            nearbyEvents={plan.nearbyEvents}
            onSave={handleSave}
            onCancel={() => setEditingLeg(undefined)}
          />
        </Card>
      )}

      {/* Empty state */}
      {legs.length === 0 && !isFormOpen && <EmptyState onAdd={() => setEditingLeg(null)} />}

      {/* Active legs */}
      {activeLegs.length > 0 && (
        <div className="space-y-3">
          {activeLegs.map((leg) => (
            <LegCard
              key={leg.id}
              leg={leg}
              onEdit={(l) => setEditingLeg(l)}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onIngredientStatusChange={handleIngredientStatusChange}
            />
          ))}
        </div>
      )}

      {/* Completed legs (collapsed by default) */}
      {completedLegs.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-stone-500 hover:text-stone-300">
            {completedLegs.length} completed trip{completedLegs.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-3 space-y-3">
            {completedLegs.map((leg) => (
              <LegCard
                key={leg.id}
                leg={leg}
                onEdit={(l) => setEditingLeg(l)}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onIngredientStatusChange={handleIngredientStatusChange}
              />
            ))}
          </div>
        </details>
      )}

      {/* Cancelled legs */}
      {cancelledLegs.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-stone-300 hover:text-stone-300">
            {cancelledLegs.length} cancelled trip{cancelledLegs.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-3 space-y-3">
            {cancelledLegs.map((leg) => (
              <LegCard
                key={leg.id}
                leg={leg}
                onEdit={(l) => setEditingLeg(l)}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onIngredientStatusChange={handleIngredientStatusChange}
              />
            ))}
          </div>
        </details>
      )}

      {isPending && <p className="text-xs text-stone-300 text-center">Saving…</p>}
    </div>
  )
}
