'use client'

/**
 * IngredientResolutionView
 *
 * Renders the 3-tier availability resolution for a given ingredient.
 *
 * TIER 1 (green) - System already knows. Price and availability confirmed
 *   from OpenClaw store data within the last 3 days. No action required.
 *
 * TIER 2 (amber) - Supplier known, signal stale or unconfirmed.
 *   Data exists but is older than 3 days. Worth checking before ordering.
 *
 * TIER 3 (red/violet) - System has no data. Call warranted.
 *   Only these vendors surface the call interface. Every vendor shown here
 *   represents the boundary of known data after full pipeline exhaustion.
 */

import { useState } from 'react'
import type {
  IngredientResolution,
  ResolvedStore,
  PartialSignal,
} from '@/lib/calling/ingredient-resolution'
import type { VendorCallCandidate } from '@/lib/vendors/sourcing-actions'
import {
  Check,
  AlertCircle,
  Phone,
  Clock,
  ChevronDown,
  ChevronUp,
  Star,
  MapPin,
  Loader2,
  X,
  Mic,
  Database,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Shared formatting helpers
// ---------------------------------------------------------------------------

function formatPrice(cents: number, unit?: string | null): string {
  const dollars = (cents / 100).toFixed(2)
  return unit ? `$${dollars}/${unit}` : `$${dollars}`
}

function freshnessColor(freshness: ResolvedStore['freshness']): string {
  if (freshness === 'current') return 'text-emerald-400'
  if (freshness === 'recent') return 'text-amber-400'
  return 'text-stone-500'
}

function freshnessLabel(freshness: ResolvedStore['freshness']): string {
  if (freshness === 'current') return 'Current'
  if (freshness === 'recent') return 'Recent'
  return 'Stale'
}

// ---------------------------------------------------------------------------
// Tier 1 panel: resolved (data confirmed)
// ---------------------------------------------------------------------------

function ResolvedPanel({ stores }: { stores: ResolvedStore[] }) {
  const [expanded, setExpanded] = useState(stores.length <= 3)

  const visible = expanded ? stores : stores.slice(0, 3)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
          Confirmed available ({stores.length})
        </p>
        <span className="text-xs text-stone-600">from market data</span>
      </div>
      <div className="bg-stone-900 border border-emerald-900/40 rounded-xl overflow-hidden divide-y divide-stone-800/60">
        {visible.map((store, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-stone-200 truncate">
                  {store.chainName}
                </span>
                <span className="flex items-center gap-1 text-xs text-stone-500">
                  <MapPin className="w-3 h-3" />
                  {store.city}, {store.state}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5 truncate">{store.productName}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-sm font-semibold text-stone-200">
                {formatPrice(store.salePriceCents ?? store.priceCents, store.sizeUnit)}
                {store.salePriceCents && store.salePriceCents < store.priceCents && (
                  <span className="ml-1 text-xs text-emerald-400">sale</span>
                )}
              </p>
              <p className={`text-xs ${freshnessColor(store.freshness)}`}>
                {freshnessLabel(store.freshness)}
              </p>
            </div>
          </div>
        ))}
      </div>
      {stores.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 pl-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" /> Show fewer
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Show {stores.length - 3} more
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tier 2 panel: partial signals
// ---------------------------------------------------------------------------

function PartialPanel({ signals }: { signals: PartialSignal[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? signals : signals.slice(0, 3)

  const sourceLabel = (source: PartialSignal['source']) => {
    if (source === 'vendor_price_point') return 'your data'
    if (source === 'openclaw_stale') return 'market data'
    return 'history'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
          Known supplier, signal stale ({signals.length})
        </p>
        <span className="text-xs text-stone-600">verify before ordering</span>
      </div>
      <div className="bg-stone-900 border border-amber-900/30 rounded-xl overflow-hidden divide-y divide-stone-800/60">
        {visible.map((sig, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-stone-300 truncate">
                  {sig.vendorName}
                </span>
                {sig.city && (
                  <span className="flex items-center gap-1 text-xs text-stone-600">
                    <MapPin className="w-3 h-3" />
                    {sig.city}
                    {sig.state ? `, ${sig.state}` : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock className="w-3 h-3 text-stone-600" />
                <span className="text-xs text-stone-500">
                  {sig.dataAge} via {sourceLabel(sig.source)}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 text-right space-y-0.5">
              {sig.priceCents ? (
                <p className="text-sm font-semibold text-stone-400">
                  {formatPrice(sig.priceCents, sig.priceUnit)}
                </p>
              ) : (
                <p className="text-xs text-stone-600">price unknown</p>
              )}
              {sig.phone && <p className="text-xs text-stone-600 font-mono">{sig.phone}</p>}
            </div>
          </div>
        ))}
      </div>
      {signals.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 pl-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" /> Show fewer
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Show {signals.length - 3} more
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tier 3 panel: unresolved vendors + call interface
// ---------------------------------------------------------------------------

const VENDOR_TYPE_LABELS: Record<string, string> = {
  specialty: 'Specialty',
  butcher: 'Butcher',
  fishmonger: 'Fishmonger',
  farm: 'Farm',
  greengrocer: 'Produce',
  produce: 'Produce',
  dairy: 'Dairy',
  cheese: 'Cheese',
  organic: 'Organic',
  bakery: 'Bakery',
  deli: 'Deli',
}

const TYPE_COLORS: Record<string, string> = {
  butcher: 'bg-red-900/30 text-red-400',
  fishmonger: 'bg-blue-900/30 text-blue-400',
  greengrocer: 'bg-green-900/30 text-green-400',
  produce: 'bg-green-900/30 text-green-400',
  farm: 'bg-lime-900/30 text-lime-400',
  deli: 'bg-orange-900/30 text-orange-400',
  cheese: 'bg-yellow-900/30 text-yellow-400',
  organic: 'bg-emerald-900/30 text-emerald-400',
  specialty: 'bg-violet-900/30 text-violet-400',
}

type CallState =
  | { phase: 'idle' }
  | { phase: 'calling' }
  | {
      phase: 'done'
      result: 'yes' | 'no' | null
      status: string
      priceQuoted?: string | null
      quantityAvailable?: string | null
      recordingUrl?: string | null
    }

interface UnresolvedPanelProps {
  vendors: VendorCallCandidate[]
  ingredient: string
  callStates: Record<string, CallState>
  selected: Set<string>
  onToggle: (id: string) => void
  onCallAll: () => void
  onCallOne: (vendor: VendorCallCandidate) => void
  callingAll: boolean
}

export function UnresolvedPanel({
  vendors,
  ingredient,
  callStates,
  selected,
  onToggle,
  onCallAll,
  onCallOne,
  callingAll,
}: UnresolvedPanelProps) {
  if (vendors.length === 0) return null

  const selectedCount = vendors.filter((v) => selected.has(v.id)).length
  const callingCount = vendors.filter((v) => callStates[v.id]?.phase === 'calling').length
  const toCallCount = vendors.filter(
    (v) => selected.has(v.id) && (!callStates[v.id] || callStates[v.id].phase === 'idle')
  ).length

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
            No data available ({vendors.length})
          </p>
          <span className="text-xs text-stone-600">system boundary reached</span>
        </div>
        {selectedCount > 0 && (
          <div className="flex flex-col items-end gap-0.5">
            <button
              type="button"
              onClick={onCallAll}
              disabled={callingAll || toCallCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {callingAll ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Calling {callingCount > 0 ? callingCount : toCallCount}...
                </>
              ) : (
                <>
                  <Phone className="w-3 h-3" />
                  Call {toCallCount} vendor{toCallCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
            <span className="text-[10px] text-stone-600">Billed via Twilio</span>
          </div>
        )}
      </div>

      <div className="bg-stone-900 border border-violet-900/30 rounded-xl overflow-hidden divide-y divide-stone-800/60">
        {vendors.map((vendor) => {
          const callState = callStates[vendor.id] ?? { phase: 'idle' }
          const isDone = callState.phase === 'done'
          const isCalling = callState.phase === 'calling'
          const isSelected = selected.has(vendor.id)
          const typeColor = TYPE_COLORS[vendor.vendor_type] || 'bg-stone-800 text-stone-400'

          return (
            <div
              key={vendor.id}
              className={`flex items-center gap-3 px-4 py-3 ${isSelected && !isDone ? 'bg-violet-950/20' : ''}`}
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => onToggle(vendor.id)}
                disabled={isDone || isCalling}
                aria-label={`Select ${vendor.name}`}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                  ${isDone || isCalling ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                  ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-stone-600 bg-transparent hover:border-stone-400'}`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </button>

              {/* Vendor info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-stone-200 truncate">{vendor.name}</span>
                  {vendor.is_preferred && (
                    <Star className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" />
                  )}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${typeColor}`}
                  >
                    {VENDOR_TYPE_LABELS[vendor.vendor_type] || vendor.vendor_type}
                  </span>
                  {vendor.source === 'national' && (
                    <span className="text-xs text-stone-600 flex-shrink-0">Directory</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-stone-500 font-mono">{vendor.phone}</span>
                  {(vendor.city || vendor.address) && (
                    <span className="flex items-center gap-1 text-xs text-stone-600">
                      <MapPin className="w-3 h-3" />
                      {[vendor.city, vendor.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Call result / action */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {callState.phase === 'idle' && (
                  <button
                    type="button"
                    onClick={() => onCallOne(vendor)}
                    disabled={!isSelected}
                    className="text-xs px-2.5 py-1.5 rounded-md border transition-colors
                      border-stone-700 bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200
                      disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Call now
                  </button>
                )}
                {callState.phase === 'calling' && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Calling...
                  </span>
                )}
                {callState.phase === 'done' && (
                  <div className="flex flex-col items-end gap-0.5">
                    <span
                      className={`flex items-center gap-1 text-xs font-medium
                        ${'result' in callState && callState.result === 'yes' ? 'text-emerald-400' : ''}
                        ${'result' in callState && callState.result === 'no' ? 'text-rose-400' : ''}
                        ${'result' in callState && callState.result === null ? 'text-stone-400' : ''}`}
                    >
                      {'result' in callState && callState.result === 'yes' && (
                        <>
                          <Check className="w-3 h-3" /> In stock
                        </>
                      )}
                      {'result' in callState && callState.result === 'no' && (
                        <>
                          <X className="w-3 h-3" /> Not available
                        </>
                      )}
                      {'result' in callState && callState.result === null && 'No answer'}
                    </span>
                    {'priceQuoted' in callState && callState.priceQuoted && (
                      <span className="text-[10px] text-stone-400">{callState.priceQuoted}</span>
                    )}
                    {'recordingUrl' in callState && callState.recordingUrl && (
                      <a
                        href={callState.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300"
                      >
                        <Mic className="w-3 h-3" />
                        Listen
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export: full resolution view
// Combines all three tiers into one coherent surface
// ---------------------------------------------------------------------------

interface IngredientResolutionViewProps {
  resolution: IngredientResolution
  callStates: Record<string, CallState>
  selected: Set<string>
  onToggle: (id: string) => void
  onCallAll: () => void
  onCallOne: (vendor: VendorCallCandidate) => void
  callingAll: boolean
  confirmOpen: boolean
  onConfirmOpen: () => void
  onConfirmClose: () => void
}

export function IngredientResolutionView({
  resolution,
  callStates,
  selected,
  onToggle,
  onCallAll,
  onCallOne,
  callingAll,
  confirmOpen,
  onConfirmOpen,
  onConfirmClose,
}: IngredientResolutionViewProps) {
  const { resolved, partial, unresolved, ingredientName, confidenceLevel } = resolution

  const toCallCount = unresolved.filter(
    (v) => selected.has(v.id) && (!callStates[v.id] || callStates[v.id].phase === 'idle')
  ).length

  const hasAnyData = resolved.length > 0 || partial.length > 0

  return (
    <div className="space-y-6">
      {/* Pre-call confirmation modal */}
      {confirmOpen && toCallCount > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-950 rounded-lg">
                <Phone className="w-4 h-4 text-violet-400" />
              </div>
              <h2 className="text-base font-semibold text-stone-100">Confirm calls</h2>
            </div>
            <p className="text-sm text-stone-400">
              You are about to call{' '}
              <span className="text-stone-200 font-medium">
                {toCallCount} vendor{toCallCount !== 1 ? 's' : ''}
              </span>{' '}
              about <span className="text-stone-200 font-medium">{ingredientName}</span>.
              {hasAnyData && (
                <span className="block mt-1 text-xs text-stone-500">
                  These are the only vendors with no existing data signal after full system
                  resolution.
                </span>
              )}
            </p>
            <p className="text-xs text-stone-600">
              Each call is 2-3 minutes. Billed via your Twilio account.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onCallAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                Call {toCallCount} vendor{toCallCount !== 1 ? 's' : ''}
              </button>
              <button
                type="button"
                onClick={onConfirmClose}
                className="px-4 py-2 rounded-lg text-sm text-stone-400 hover:text-stone-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confidence summary bar */}
      <div className="flex items-center gap-3 text-xs">
        <Database className="w-3.5 h-3.5 text-stone-500" />
        <span className="text-stone-500">
          System resolution for <span className="text-stone-300 font-medium">{ingredientName}</span>
          :
        </span>
        {confidenceLevel === 'high' && (
          <span className="text-emerald-400 font-medium">High confidence</span>
        )}
        {confidenceLevel === 'medium' && (
          <span className="text-amber-400 font-medium">Partial coverage</span>
        )}
        {confidenceLevel === 'low' && (
          <span className="text-orange-400 font-medium">Limited signal</span>
        )}
        {confidenceLevel === 'none' && (
          <span className="text-stone-500 font-medium">No data found</span>
        )}
        <span className="text-stone-700">
          {resolved.length} confirmed · {partial.length} stale · {unresolved.length} unresolved
        </span>
      </div>

      {/* Tier 1 */}
      {resolved.length > 0 && <ResolvedPanel stores={resolved} />}

      {/* Tier 2 */}
      {partial.length > 0 && <PartialPanel signals={partial} />}

      {/* Tier 3 */}
      {unresolved.length > 0 && (
        <UnresolvedPanel
          vendors={unresolved}
          ingredient={ingredientName}
          callStates={callStates}
          selected={selected}
          onToggle={onToggle}
          onCallAll={toCallCount >= 2 ? onConfirmOpen : onCallAll}
          onCallOne={onCallOne}
          callingAll={callingAll}
        />
      )}

      {/* All resolved - no calls needed */}
      {unresolved.length === 0 && hasAnyData && (
        <div className="flex items-center gap-2 text-sm text-stone-500 py-2">
          <Check className="w-4 h-4 text-emerald-500" />
          System resolved {ingredientName} through existing data. No vendor calls needed.
        </div>
      )}

      {/* No data at all */}
      {!hasAnyData && unresolved.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-stone-600 py-2">
          <AlertCircle className="w-4 h-4" />
          No vendors or market data found for {ingredientName} in your region.
        </div>
      )}
    </div>
  )
}
