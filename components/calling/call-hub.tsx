'use client'

/**
 * Call Hub
 *
 * The resolution-first calling interface.
 *
 * Before any vendor contact is offered, the system exhausts every passive
 * data channel (OpenClaw market data, chef's own vendor price points,
 * ingredient price history). The call interface surfaces ONLY for vendors
 * that have no availability signal after full pipeline resolution.
 *
 * Vendor calls are a precision fallback at the boundary of known data.
 * They are not a convenience feature.
 *
 * Flow:
 *   1. Chef types an ingredient
 *   2. System runs 3-tier resolution (OpenClaw + vendor data + history)
 *   3. Tier 1 (confirmed): shown as read-only market data
 *   4. Tier 2 (partial): shown with stale signal warning
 *   5. Tier 3 (unresolved): ONLY these get the call interface
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { resolveIngredientAvailability } from '@/lib/calling/ingredient-resolution'
import type { IngredientResolution } from '@/lib/calling/ingredient-resolution'
import type { VendorCallCandidate } from '@/lib/vendors/sourcing-actions'
import {
  initiateSupplierCall,
  initiateAdHocCall,
  getCallStatus,
} from '@/lib/calling/twilio-actions'
import { useSSE } from '@/lib/realtime/sse-client'
import { Phone, Search, Loader2, X, Mic, ChevronRight, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { IngredientResolutionView } from '@/components/calling/ingredient-resolution-view'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// Map from callId -> vendorId so SSE results can update the right row
const callIdToVendorId = new Map<string, string>()

// ---------------------------------------------------------------------------
// CallHub
// ---------------------------------------------------------------------------

export function CallHub({ tenantId }: { tenantId?: string }) {
  const [ingredient, setIngredient] = useState('')
  const [resolution, setResolution] = useState<IngredientResolution | null>(null)
  const [resolving, setResolving] = useState(false)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [callStates, setCallStates] = useState<Record<string, CallState>>({})
  const [callingAll, setCallingAll] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Quick Call - collapsed secondary flow
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickPhone, setQuickPhone] = useState('')
  const [quickName, setQuickName] = useState('')
  const [quickIngredient, setQuickIngredient] = useState('')
  const [quickCalling, setQuickCalling] = useState(false)
  const [quickResult, setQuickResult] = useState<CallState>({ phase: 'idle' })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // SSE: receive call results in real-time
  const handleSSEMessage = useCallback((msg: { event: string; data: any }) => {
    if (msg.event !== 'supplier_call_result') return
    const { callId, vendorId, result, status, priceQuoted, quantityAvailable, recordingUrl } =
      msg.data

    const vid = vendorId || (callId ? callIdToVendorId.get(callId) : null)
    if (!vid) return

    const terminal = ['completed', 'failed', 'no_answer', 'busy'].includes(status)
    if (terminal) {
      setCallStates((prev) => ({
        ...prev,
        [vid]: {
          phase: 'done',
          result: result ?? null,
          status,
          priceQuoted,
          quantityAvailable,
          recordingUrl,
        },
      }))
    }
  }, [])

  useSSE(tenantId ? `chef-${tenantId}` : 'disabled', {
    onMessage: handleSSEMessage,
    enabled: !!tenantId,
  })

  // Resolution: debounced on ingredient change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (ingredient.trim().length < 2) {
      setResolution(null)
      setSelected(new Set())
      setCallStates({})
      return
    }
    debounceRef.current = setTimeout(async () => {
      setResolving(true)
      try {
        const result = await resolveIngredientAvailability(ingredient.trim())
        setResolution(result)
        // Auto-select all unresolved specialty vendors (saved ones only)
        const autoSelected = new Set(
          result.unresolved.filter((v) => v.source === 'saved' || v.is_preferred).map((v) => v.id)
        )
        setSelected(autoSelected)
        setCallStates({})
      } catch {
        setResolution(null)
      } finally {
        setResolving(false)
      }
    }, 500)
  }, [ingredient])

  // ---------------------------------------------------------------------------
  // Call mechanics
  // ---------------------------------------------------------------------------

  async function placeCall(vendor: VendorCallCandidate) {
    setCallStates((prev) => ({ ...prev, [vendor.id]: { phase: 'calling' } }))
    try {
      let result: Awaited<ReturnType<typeof initiateSupplierCall>>

      if (vendor.source === 'saved') {
        result = await initiateSupplierCall(vendor.id, ingredient.trim())
      } else {
        result = await initiateAdHocCall(vendor.phone, vendor.name, ingredient.trim(), vendor.id)
      }

      if (!result.success) {
        setCallStates((prev) => ({
          ...prev,
          [vendor.id]: { phase: 'done', result: null, status: result.error ?? 'Failed' },
        }))
        return
      }

      const callId = result.callId!
      callIdToVendorId.set(callId, vendor.id)

      // Poll as fallback if SSE misses
      let attempts = 0
      const poll = setInterval(async () => {
        if (callStates[vendor.id]?.phase === 'done') {
          clearInterval(poll)
          return
        }
        attempts++
        const status = await getCallStatus(callId)
        if (!status) return
        if (['completed', 'failed', 'no_answer', 'busy'].includes(status.status)) {
          clearInterval(poll)
          setCallStates((prev) => ({
            ...prev,
            [vendor.id]: {
              phase: 'done',
              result: status.result,
              status: status.status,
              priceQuoted: status.price_quoted,
              quantityAvailable: status.quantity_available,
              recordingUrl: status.recording_url,
            },
          }))
        }
        if (attempts >= 22) clearInterval(poll)
      }, 4000)
    } catch {
      setCallStates((prev) => ({
        ...prev,
        [vendor.id]: { phase: 'done', result: null, status: 'Error placing call' },
      }))
    }
  }

  async function callSelected() {
    if (!resolution) return
    const toCall = resolution.unresolved.filter(
      (v) => selected.has(v.id) && (!callStates[v.id] || callStates[v.id].phase === 'idle')
    )
    if (toCall.length === 0) return
    setConfirmOpen(false)
    setCallingAll(true)
    await Promise.allSettled(toCall.map((v) => placeCall(v)))
    setCallingAll(false)
  }

  function toggleVendor(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ---------------------------------------------------------------------------
  // Quick Call
  // ---------------------------------------------------------------------------

  async function placeQuickCall() {
    const phone = quickPhone.replace(/\D/g, '')
    if (phone.length < 10) {
      toast.error('Enter a valid phone number')
      return
    }
    if (!quickIngredient.trim()) {
      toast.error('Enter what to ask about')
      return
    }
    setQuickCalling(true)
    setQuickResult({ phase: 'calling' })
    try {
      const result = await initiateAdHocCall(
        phone.length === 10 ? `+1${phone}` : `+${phone}`,
        quickName.trim() || 'Vendor',
        quickIngredient.trim()
      )
      if (!result.success) {
        setQuickResult({ phase: 'done', result: null, status: result.error ?? 'Failed' })
        toast.error(result.error ?? 'Call failed')
        return
      }
      toast.success('Call placed!')
      const callId = result.callId!
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const status = await getCallStatus(callId)
        if (!status) return
        if (['completed', 'failed', 'no_answer', 'busy'].includes(status.status)) {
          clearInterval(poll)
          setQuickResult({
            phase: 'done',
            result: status.result,
            status: status.status,
            priceQuoted: status.price_quoted,
            quantityAvailable: status.quantity_available,
            recordingUrl: status.recording_url,
          })
        }
        if (attempts >= 30) clearInterval(poll)
      }, 3000)
    } catch {
      setQuickResult({ phase: 'done', result: null, status: 'Error' })
    } finally {
      setQuickCalling(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          value={ingredient}
          onChange={(e) => setIngredient(e.target.value)}
          placeholder="What are you looking for? (e.g. haddock, dry-aged beef, black truffle...)"
          className="w-full pl-10 pr-4 py-3 text-sm bg-stone-900 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          autoFocus
        />
        {ingredient && (
          <button
            type="button"
            onClick={() => setIngredient('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Resolving indicator */}
      {resolving && (
        <div className="flex items-center gap-2 text-sm text-stone-500 pl-1">
          <Loader2 className="w-4 h-4 animate-spin" />
          Resolving availability...
        </div>
      )}

      {/* Resolution view */}
      {!resolving && resolution && (
        <IngredientResolutionView
          resolution={resolution}
          callStates={callStates}
          selected={selected}
          onToggle={toggleVendor}
          onCallAll={callSelected}
          onCallOne={placeCall}
          callingAll={callingAll}
          confirmOpen={confirmOpen}
          onConfirmOpen={() => setConfirmOpen(true)}
          onConfirmClose={() => setConfirmOpen(false)}
        />
      )}

      {/* Empty state: shown when nothing typed */}
      {!ingredient.trim() && (
        <div className="py-8 space-y-6">
          <div className="space-y-4 max-w-sm">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              How resolution works
            </p>
            {[
              {
                n: '1',
                label: 'Type an ingredient',
                sub: 'System queries OpenClaw market data, your vendor history, and price records simultaneously.',
              },
              {
                n: '2',
                label: 'See what the system already knows',
                sub: 'Confirmed availability, pricing, and stale signals are surfaced before any vendor is contacted.',
              },
              {
                n: '3',
                label: 'Calls go out only where data ends',
                sub: 'Only specialty vendors with no signal in any data source reach the call interface.',
              },
            ].map(({ n, label, sub }) => (
              <div key={n} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-800 text-stone-500 text-xs font-bold flex items-center justify-center mt-0.5">
                  {n}
                </span>
                <div>
                  <p className="text-sm font-medium text-stone-300">{label}</p>
                  <p className="text-xs text-stone-600 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-700 max-w-sm">
            No saved vendors?{' '}
            <a
              href="/culinary/call-sheet?tab=vendors"
              className="text-stone-500 underline underline-offset-2 hover:text-stone-400"
            >
              Add them in My Vendors
            </a>{' '}
            so they appear in Tier 3 resolution.
          </p>
        </div>
      )}

      {/* Quick Call - collapsed, secondary flow */}
      <div className="border-t border-stone-800 pt-4">
        <button
          type="button"
          onClick={() => setQuickOpen((v) => !v)}
          className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          {quickOpen ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          Quick Call - dial any number directly
        </button>

        {quickOpen && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="tel"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
                placeholder="Phone number"
                className="px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input
                type="text"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="Vendor name (optional)"
                className="px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input
                type="text"
                value={quickIngredient}
                onChange={(e) => setQuickIngredient(e.target.value)}
                placeholder="Ask about... (e.g. haddock)"
                onKeyDown={(e) => e.key === 'Enter' && placeQuickCall()}
                className="px-3 py-2 text-sm bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={placeQuickCall}
                disabled={quickCalling || quickResult.phase === 'calling'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                  bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {quickResult.phase === 'calling' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Calling...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" /> Call now
                  </>
                )}
              </button>
              {quickResult.phase === 'done' && (
                <div className="flex items-center gap-3 text-sm">
                  {'result' in quickResult && quickResult.result === 'yes' && (
                    <span className="text-emerald-400 font-medium">In stock</span>
                  )}
                  {'result' in quickResult && quickResult.result === 'no' && (
                    <span className="text-rose-400 font-medium">Not available</span>
                  )}
                  {'result' in quickResult && quickResult.result === null && (
                    <span className="text-stone-400">
                      {'status' in quickResult ? quickResult.status : 'No answer'}
                    </span>
                  )}
                  {'priceQuoted' in quickResult && quickResult.priceQuoted && (
                    <span className="text-stone-300 font-mono text-xs">
                      {quickResult.priceQuoted}
                    </span>
                  )}
                  {'recordingUrl' in quickResult && quickResult.recordingUrl && (
                    <a
                      href={quickResult.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-violet-400 hover:text-violet-300 text-xs"
                    >
                      <Mic className="w-3 h-3" />
                      Listen
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setQuickResult({ phase: 'idle' })
                      setQuickPhone('')
                      setQuickIngredient('')
                    }}
                    className="text-xs text-stone-500 hover:text-stone-300 underline underline-offset-2"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
