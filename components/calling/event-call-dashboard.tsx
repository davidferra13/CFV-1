'use client'

/**
 * Event Call Dashboard
 *
 * Shows upcoming events (next 7 days) with ingredient resolution status.
 * The chef sees at a glance which events need vendor attention, and can
 * drill into each event to see ingredients grouped by vendor with call buttons.
 *
 * Replaces the ingredient-search-first paradigm with an event-first view.
 */

import { useState, useCallback, useTransition } from 'react'
import {
  getUpcomingEventsWithResolution,
  resolveEventIngredients,
  getEventIngredientsByVendor,
} from '@/lib/calling/event-resolution-actions'
import type {
  UpcomingEventSummary,
  VendorIngredientGroup,
} from '@/lib/calling/event-resolution-actions'
import { initiateSupplierCall } from '@/lib/calling/twilio-actions'
import { useSSE } from '@/lib/realtime/sse-client'
import {
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  Phone,
  Loader2,
  Check,
  AlertCircle,
  Clock,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EventCallDashboardProps {
  events: UpcomingEventSummary[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventCallDashboard({ events: initialEvents }: EventCallDashboardProps) {
  const [events, setEvents] = useState(initialEvents)
  const [expandedId, setExpandedId] = useState<string | null>(
    initialEvents.length > 0 ? initialEvents[0].id : null
  )
  const [vendorGroups, setVendorGroups] = useState<Record<string, VendorIngredientGroup[]>>({})
  const [loadingVendors, setLoadingVendors] = useState<Record<string, boolean>>({})
  const [resolvingEvent, setResolvingEvent] = useState<Record<string, boolean>>({})
  const [callingVendor, setCallingVendor] = useState<Record<string, boolean>>({})
  const [, startTransition] = useTransition()

  // SSE for real-time call results
  const handleSSEMessage = useCallback((msg: { event: string; data: any }) => {
    if (msg.event !== 'supplier_call_result') return
    // Refresh event data when a call completes
    startTransition(async () => {
      try {
        const updated = await getUpcomingEventsWithResolution(7)
        setEvents(updated)
      } catch (err) {
        console.error('[event-call-dashboard] SSE refresh failed:', err)
      }
    })
  }, [])

  useSSE('calling', {
    onMessage: handleSSEMessage,
    enabled: true,
  })

  // Toggle event card expansion
  function toggleExpand(eventId: string) {
    if (expandedId === eventId) {
      setExpandedId(null)
    } else {
      setExpandedId(eventId)
      // Load vendor groups if not already loaded
      if (!vendorGroups[eventId]) {
        loadVendorGroups(eventId)
      }
    }
  }

  // Load vendor ingredient groups for an event
  async function loadVendorGroups(eventId: string) {
    setLoadingVendors((prev) => ({ ...prev, [eventId]: true }))
    try {
      const groups = await getEventIngredientsByVendor(eventId)
      setVendorGroups((prev) => ({ ...prev, [eventId]: groups }))
    } catch (err) {
      console.error('[event-call-dashboard] loadVendorGroups failed:', err)
      toast.error('Failed to load vendor details')
    } finally {
      setLoadingVendors((prev) => ({ ...prev, [eventId]: false }))
    }
  }

  // Resolve all Tier 3 ingredients for an event
  async function handleResolveAll(eventId: string) {
    setResolvingEvent((prev) => ({ ...prev, [eventId]: true }))
    try {
      const result = await resolveEventIngredients(eventId)
      toast.success(
        `Resolution complete: ${result.resolved} resolved, ${result.queued} queued, ${result.failed} failed`
      )
      // Refresh events
      const updated = await getUpcomingEventsWithResolution(7)
      setEvents(updated)
      // Refresh vendor groups
      if (vendorGroups[eventId]) {
        loadVendorGroups(eventId)
      }
    } catch (err) {
      console.error('[event-call-dashboard] handleResolveAll failed:', err)
      toast.error('Failed to resolve ingredients')
    } finally {
      setResolvingEvent((prev) => ({ ...prev, [eventId]: false }))
    }
  }

  // Place a call to a vendor about their ingredients
  async function handleCallVendor(vendorId: string, ingredientName: string) {
    const vendorKey = `${vendorId}:${ingredientName}`
    setCallingVendor((prev) => ({ ...prev, [vendorKey]: true }))
    try {
      const result = await initiateSupplierCall(vendorId, ingredientName)
      if (!result.success) {
        toast.error(result.error || 'Call failed')
      } else {
        toast.success('Call placed')
      }
    } catch (err) {
      console.error('[event-call-dashboard] handleCallVendor failed:', err)
      toast.error('Failed to place call')
    } finally {
      setCallingVendor((prev) => ({ ...prev, [vendorKey]: false }))
    }
  }

  // Format event date for display
  function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86_400_000)

    const dateFormatted = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

    if (diffDays === 0) return `Today (${dateFormatted})`
    if (diffDays === 1) return `Tomorrow (${dateFormatted})`
    return `${dateFormatted} (${diffDays} days)`
  }

  // Resolution status color
  function getStatusColor(event: UpcomingEventSummary): string {
    if (!event.ingredients.length) return 'border-stone-700'
    const total = event.ingredients.length
    const resolved = event.ingredients.filter((i) => i.resolved).length
    if (resolved === total) return 'border-green-500/50'
    if (resolved >= total * 0.5) return 'border-amber-500/50'
    return 'border-red-500/50'
  }

  // Progress bar color
  function getProgressColor(resolved: number, total: number): string {
    if (total === 0) return 'bg-stone-600'
    const pct = resolved / total
    if (pct >= 1) return 'bg-green-500'
    if (pct >= 0.5) return 'bg-amber-500'
    return 'bg-red-500'
  }

  // Tier badge
  function TierBadge({ tier, resolved }: { tier: 1 | 2 | 3; resolved: boolean }) {
    if (resolved) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
          <Check className="w-3 h-3" />
          Resolved
        </span>
      )
    }
    if (tier === 2) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
          <Clock className="w-3 h-3" />
          Partial
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">
        <AlertCircle className="w-3 h-3" />
        Unresolved
      </span>
    )
  }

  // Empty state
  if (!events.length) {
    return (
      <div className="py-12 text-center">
        <Calendar className="w-10 h-10 text-stone-600 mx-auto mb-3" />
        <p className="text-sm text-stone-400">No upcoming events in the next 7 days</p>
        <p className="text-xs text-stone-600 mt-1">
          Events with confirmed or accepted status will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const isExpanded = expandedId === event.id
        const totalIngredients = event.ingredients.length
        const resolvedCount = event.ingredients.filter((i) => i.resolved).length
        const tier3Count = event.ingredients.filter((i) => i.tier === 3).length
        const eventVendors = vendorGroups[event.id] || []
        const isLoadingVendors = loadingVendors[event.id]
        const isResolving = resolvingEvent[event.id]

        return (
          <div
            key={event.id}
            className={`rounded-lg border bg-card shadow-sm transition-all duration-200 ${getStatusColor(event)}`}
          >
            {/* Card header (always visible) */}
            <button
              type="button"
              onClick={() => toggleExpand(event.id)}
              className="w-full text-left p-4 flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-stone-100 truncate">{event.title}</h3>
                  {event.client_name && (
                    <span className="text-xs text-stone-500 truncate">for {event.client_name}</span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-stone-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(event.event_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {event.guest_count} guests
                  </span>
                </div>

                {/* Progress bar */}
                {totalIngredients > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-stone-500">
                        {resolvedCount}/{totalIngredients} ingredients resolved
                      </span>
                      {tier3Count > 0 && (
                        <span className="text-violet-400">{tier3Count} need calls</span>
                      )}
                    </div>
                    <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${getProgressColor(resolvedCount, totalIngredients)}`}
                        style={{
                          width: `${totalIngredients > 0 ? (resolvedCount / totalIngredients) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {totalIngredients === 0 && (
                  <p className="text-xs text-stone-600 mt-1">No recipes linked to this event</p>
                )}
              </div>

              <div className="flex-shrink-0 pt-1">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-stone-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-500" />
                )}
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && totalIngredients > 0 && (
              <div className="px-4 pb-4 border-t border-stone-800">
                {/* Action buttons */}
                {tier3Count > 0 && (
                  <div className="pt-3 pb-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleResolveAll(event.id)}
                      disabled={isResolving}
                      loading={isResolving}
                    >
                      {isResolving ? 'Resolving...' : <>Resolve All for {event.title}</>}
                    </Button>
                  </div>
                )}

                {/* Ingredient breakdown by tier */}
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                    Ingredients
                  </p>
                  {event.ingredients.map((ing) => (
                    <div
                      key={ing.name}
                      className="flex items-center justify-between py-1.5 px-2 rounded bg-stone-800/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-stone-200 truncate">{ing.name}</span>
                        {ing.unit && <span className="text-xs text-stone-600">({ing.unit})</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {ing.vendor_name && (
                          <span className="text-xs text-stone-500 truncate max-w-[120px]">
                            {ing.vendor_name}
                          </span>
                        )}
                        {ing.price != null && (
                          <span className="text-xs font-mono text-stone-400">
                            ${ing.price.toFixed(2)}
                          </span>
                        )}
                        <TierBadge tier={ing.tier} resolved={ing.resolved} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vendor groups section */}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                    Vendors
                  </p>

                  {isLoadingVendors && (
                    <div className="flex items-center gap-2 py-3 text-xs text-stone-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Loading vendor details...
                    </div>
                  )}

                  {!isLoadingVendors && eventVendors.length === 0 && (
                    <p className="text-xs text-stone-600 py-2">
                      No vendor matches found. Add vendors in My Vendors to see them here.
                    </p>
                  )}

                  {!isLoadingVendors &&
                    eventVendors.map((group) => (
                      <div
                        key={group.vendorId}
                        className="rounded-lg border border-stone-700 p-3 mb-2 last:mb-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-stone-200">{group.vendorName}</p>
                            {group.contactName && (
                              <p className="text-xs text-stone-500">{group.contactName}</p>
                            )}
                            <p className="text-xs text-stone-600 font-mono">{group.vendorPhone}</p>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              handleCallVendor(group.vendorId, group.ingredients.join(', '))
                            }
                            disabled={
                              callingVendor[`${group.vendorId}:${group.ingredients.join(', ')}`]
                            }
                            loading={
                              callingVendor[`${group.vendorId}:${group.ingredients.join(', ')}`]
                            }
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Call about {group.ingredients.length} item
                            {group.ingredients.length !== 1 ? 's' : ''}
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.ingredients.map((ingName) => (
                            <span
                              key={ingName}
                              className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-400"
                            >
                              {ingName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
