'use client'

// Client Dietary Banner
// Shows a compact, collapsible summary of a client's dietary info.
// Allergies are always visible (red/danger). Restrictions show as warning.
// Designed to sit at the top of quote forms, event detail, and menu editors.

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  getClientDietaryContext,
  type ClientDietaryContext,
} from '@/lib/clients/dietary-context-actions'

export function ClientDietaryBanner({ clientId }: { clientId: string }) {
  const [context, setContext] = useState<ClientDietaryContext | null>(null)
  const [loading, startTransition] = useTransition()
  const [collapsed, setCollapsed] = useState(false)
  const [fetchFailed, setFetchFailed] = useState(false)

  useEffect(() => {
    if (!clientId) return
    setFetchFailed(false)
    startTransition(async () => {
      try {
        const data = await getClientDietaryContext(clientId)
        setContext(data)
        // Auto-collapse if no allergies
        if (data && data.allergies.length === 0 && data.dietary_restrictions.length === 0) {
          setCollapsed(true)
        } else {
          setCollapsed(false)
        }
      } catch {
        setFetchFailed(true)
      }
    })
  }, [clientId])

  if (fetchFailed) {
    return (
      <Card className="p-3 border-red-800 bg-red-950/30">
        <p className="text-xs text-red-400">Could not load dietary info for this client.</p>
      </Card>
    )
  }

  if (loading && !context) {
    return (
      <Card className="p-3 animate-pulse">
        <div className="h-4 bg-stone-800 rounded w-48" />
      </Card>
    )
  }

  if (!context) return null

  const hasAllergies = context.allergies.length > 0
  const hasRestrictions = context.dietary_restrictions.length > 0
  const hasDislikes = context.dislikes.length > 0
  const hasProtocols = context.dietary_protocols.length > 0
  const hasFavCuisines = context.favorite_cuisines.length > 0
  const hasFavDishes = context.favorite_dishes.length > 0
  const hasSpiceTolerance = !!context.spice_tolerance
  const hasBeveragePrefs = !!context.wine_beverage_preferences
  const hasPastNotes = context.pastEventDietaryNotes.length > 0

  const hasAnyInfo =
    hasAllergies ||
    hasRestrictions ||
    hasDislikes ||
    hasProtocols ||
    hasFavCuisines ||
    hasFavDishes ||
    hasSpiceTolerance ||
    hasBeveragePrefs

  if (!hasAnyInfo && !hasPastNotes) return null

  const borderColor = hasAllergies
    ? 'border-red-800'
    : hasRestrictions
      ? 'border-amber-800'
      : 'border-stone-700'

  const spiceLabels: Record<string, string> = {
    none: 'No spice',
    mild: 'Mild',
    medium: 'Medium',
    hot: 'Hot',
    very_hot: 'Very hot',
  }

  return (
    <Card className={`p-4 ${borderColor}`}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-stone-200">
            Dietary Profile: {context.clientName}
          </h3>
          {hasAllergies && (
            <Badge variant="error">
              {context.allergies.length} allerg{context.allergies.length === 1 ? 'y' : 'ies'}
            </Badge>
          )}
          {hasRestrictions && (
            <Badge variant="warning">
              {context.dietary_restrictions.length} restriction
              {context.dietary_restrictions.length === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
        <span className="text-xs text-stone-500 ml-2 flex-shrink-0">
          {collapsed ? 'Show' : 'Hide'}
        </span>
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-3">
          {/* Allergies */}
          {hasAllergies && (
            <div>
              <p className="text-xs font-medium text-red-400 uppercase tracking-wide mb-1">
                Allergies
              </p>
              <div className="flex flex-wrap gap-1.5">
                {context.allergies.map((a) => (
                  <Badge key={a} variant="error">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Dietary Restrictions */}
          {hasRestrictions && (
            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-1">
                Dietary Restrictions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {context.dietary_restrictions.map((r) => (
                  <Badge key={r} variant="warning">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Dietary Protocols */}
          {hasProtocols && (
            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-1">
                Dietary Protocols
              </p>
              <div className="flex flex-wrap gap-1.5">
                {context.dietary_protocols.map((p) => (
                  <Badge key={p} variant="warning">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Dislikes */}
          {hasDislikes && (
            <div>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">
                Dislikes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {context.dislikes.map((d) => (
                  <Badge key={d} variant="info">
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Favorites row */}
          {(hasFavCuisines || hasFavDishes) && (
            <div className="flex flex-wrap gap-4">
              {hasFavCuisines && (
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">
                    Favorite Cuisines
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {context.favorite_cuisines.map((c) => (
                      <Badge key={c} variant="default">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {hasFavDishes && (
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">
                    Favorite Dishes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {context.favorite_dishes.map((d) => (
                      <Badge key={d} variant="default">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Spice + Beverage */}
          {(hasSpiceTolerance || hasBeveragePrefs) && (
            <div className="flex flex-wrap gap-4 text-xs text-stone-400">
              {hasSpiceTolerance && (
                <span>
                  Spice:{' '}
                  <span className="text-stone-200">
                    {spiceLabels[context.spice_tolerance!] || context.spice_tolerance}
                  </span>
                </span>
              )}
              {hasBeveragePrefs && (
                <span>
                  Beverages:{' '}
                  <span className="text-stone-200">{context.wine_beverage_preferences}</span>
                </span>
              )}
            </div>
          )}

          {/* Past Event Dietary Notes */}
          {hasPastNotes && (
            <div className="border-t border-stone-800 pt-2 mt-2">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
                Past Event Dietary Notes
              </p>
              <div className="space-y-1">
                {context.pastEventDietaryNotes.slice(0, 5).map((note) => (
                  <div key={note.eventId} className="text-xs text-stone-400">
                    <span className="text-stone-500">
                      {note.occasion || 'Event'} (
                      {new Date(note.eventDate + 'T12:00:00Z').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      )
                    </span>
                    {note.allergies.length > 0 && (
                      <span className="text-red-400 ml-1">
                        Allergies: {note.allergies.join(', ')}
                      </span>
                    )}
                    {note.dietary_restrictions.length > 0 && (
                      <span className="text-amber-400 ml-1">
                        Restrictions: {note.dietary_restrictions.join(', ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
