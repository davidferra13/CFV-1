'use client'

/**
 * Call Hub
 *
 * The primary calling interface. Type an ingredient, see every vendor that
 * can supply it (your saved favorites first, then nearby national vendors),
 * toggle which ones to call, and hit "Call All". Results stream back live.
 *
 * No "add vendor" step required. Call anyone in the national directory directly.
 */

import { useState, useEffect, useRef } from 'react'
import { getVendorCallQueue, type VendorCallCandidate } from '@/lib/vendors/sourcing-actions'
import {
  initiateSupplierCall,
  initiateAdHocCall,
  getCallStatus,
} from '@/lib/calling/twilio-actions'
import {
  Phone,
  Search,
  Loader2,
  Check,
  X,
  Star,
  MapPin,
  Mic,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'

type CallPhase = 'idle' | 'calling' | 'done'

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
  grocery: 'Grocery',
  liquor: 'Liquor',
  equipment: 'Equipment',
  other: 'Other',
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
  liquor: 'bg-purple-900/30 text-purple-400',
  bakery: 'bg-amber-900/30 text-amber-400',
}

export function CallHub() {
  const [ingredient, setIngredient] = useState('')
  const [vendors, setVendors] = useState<VendorCallCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [callStates, setCallStates] = useState<Record<string, CallState>>({})
  const [callingAll, setCallingAll] = useState(false)
  const [showNational, setShowNational] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Quick Call - dial any number directly
  const [quickPhone, setQuickPhone] = useState('')
  const [quickName, setQuickName] = useState('')
  const [quickIngredient, setQuickIngredient] = useState('')
  const [quickCalling, setQuickCalling] = useState(false)
  const [quickResult, setQuickResult] = useState<CallState>({ phase: 'idle' })

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (ingredient.trim().length < 2) {
      setVendors([])
      setSelected(new Set())
      setCallStates({})
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await getVendorCallQueue(ingredient.trim())
        setVendors(results)
        // Auto-select all saved vendors (favorites), not national by default
        const autoSelected = new Set(
          results.filter((v) => v.source === 'saved' || v.is_preferred).map((v) => v.id)
        )
        setSelected(autoSelected)
        setCallStates({})
      } catch {
        setVendors([])
      } finally {
        setLoading(false)
      }
    }, 400)
  }, [ingredient])

  function toggleVendor(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === vendors.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(vendors.map((v) => v.id)))
    }
  }

  function selectAllNational() {
    setSelected((prev) => {
      const next = new Set(prev)
      vendors.filter((v) => v.source === 'national').forEach((v) => next.add(v.id))
      return next
    })
  }

  async function placeCall(vendor: VendorCallCandidate) {
    setCallStates((prev) => ({ ...prev, [vendor.id]: { phase: 'calling' } }))

    try {
      let result: Awaited<ReturnType<typeof initiateSupplierCall>>

      if (vendor.source === 'saved') {
        result = await initiateSupplierCall(vendor.id, ingredient.trim())
      } else {
        // National vendor - call directly without saving
        result = await initiateAdHocCall(vendor.phone, vendor.name, ingredient.trim(), vendor.id)
      }

      if (!result.success) {
        setCallStates((prev) => ({
          ...prev,
          [vendor.id]: { phase: 'done', result: null, status: result.error ?? 'Failed' },
        }))
        return
      }

      // Poll for result every 3s for up to 90s
      const callId = result.callId!
      let attempts = 0
      const poll = setInterval(async () => {
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
        if (attempts >= 30) clearInterval(poll)
      }, 3000)
    } catch {
      setCallStates((prev) => ({
        ...prev,
        [vendor.id]: { phase: 'done', result: null, status: 'Error placing call' },
      }))
    }
  }

  async function callSelected() {
    const toCall = vendors.filter(
      (v) => selected.has(v.id) && (!callStates[v.id] || callStates[v.id].phase === 'idle')
    )
    if (toCall.length === 0) return
    setCallingAll(true)
    await Promise.allSettled(toCall.map((v) => placeCall(v)))
    setCallingAll(false)
  }

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

  const savedVendors = vendors.filter((v) => v.source === 'saved')
  const nationalVendors = vendors.filter((v) => v.source === 'national')
  const selectedCount = vendors.filter((v) => selected.has(v.id)).length
  const callingCount = vendors.filter((v) => callStates[v.id]?.phase === 'calling').length
  const doneCount = vendors.filter((v) => callStates[v.id]?.phase === 'done').length

  return (
    <div className="space-y-6">
      {/* Quick Call - dial any number directly */}
      <div className="bg-stone-900 border border-stone-700 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
          Quick Call - any number
        </p>
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
                <Loader2 className="w-4 h-4 animate-spin" />
                Calling...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                Call now
              </>
            )}
          </button>
          {quickResult.phase === 'done' && (
            <div className="flex items-center gap-3 text-sm">
              {'result' in quickResult && quickResult.result === 'yes' && (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Check className="w-4 h-4" />
                  In stock
                </span>
              )}
              {'result' in quickResult && quickResult.result === 'no' && (
                <span className="flex items-center gap-1 text-rose-400 font-medium">
                  <X className="w-4 h-4" />
                  Not available
                </span>
              )}
              {'result' in quickResult && quickResult.result === null && (
                <span className="text-stone-400">
                  {'status' in quickResult ? quickResult.status : 'No answer'}
                </span>
              )}
              {'priceQuoted' in quickResult && quickResult.priceQuoted && (
                <span className="text-stone-300 font-mono text-xs">{quickResult.priceQuoted}</span>
              )}
              {'recordingUrl' in quickResult && quickResult.recordingUrl && (
                <a
                  href={quickResult.recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-violet-400 hover:text-violet-300 text-xs"
                >
                  <Mic className="w-3 h-3" />
                  Listen to recording
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

      <div className="border-t border-stone-800" />

      {/* Ingredient search */}
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-stone-500 pl-1">
          <Loader2 className="w-4 h-4 animate-spin" />
          Finding vendors...
        </div>
      )}

      {!loading && ingredient.trim().length >= 2 && vendors.length === 0 && (
        <div className="text-sm text-stone-500 pl-1">
          No vendors found for &ldquo;{ingredient}&rdquo; in your area. Try a more general term.
        </div>
      )}

      {vendors.length > 0 && (
        <div className="space-y-4">
          {/* Call controls bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-stone-400">
                {selectedCount} of {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} selected
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2"
              >
                {selected.size === vendors.length ? 'Deselect all' : 'Select all'}
              </button>
              {doneCount > 0 && (
                <span className="text-xs text-stone-500">
                  {doneCount} call{doneCount !== 1 ? 's' : ''} complete
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={callSelected}
              disabled={callingAll || selectedCount === 0 || callingCount === selectedCount}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                bg-violet-600 hover:bg-violet-500 text-white
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {callingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calling {callingCount > 0 ? `${callingCount}` : selectedCount}...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  Call {selectedCount > 0 ? `${selectedCount}` : ''} vendor
                  {selectedCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>

          {/* Saved vendors (favorites) */}
          {savedVendors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider px-1">
                Your vendors ({savedVendors.length})
              </p>
              <div className="bg-stone-900 rounded-xl border border-stone-700 divide-y divide-stone-800 overflow-hidden">
                {savedVendors.map((vendor) => (
                  <VendorRow
                    key={vendor.id}
                    vendor={vendor}
                    selected={selected.has(vendor.id)}
                    callState={callStates[vendor.id] ?? { phase: 'idle' }}
                    onToggle={() => toggleVendor(vendor.id)}
                    onCall={() => placeCall(vendor)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* National vendors */}
          {nationalVendors.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setShowNational((v) => !v)}
                className="flex items-center gap-2 w-full text-left px-1"
              >
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex-1">
                  Nearby vendors ({nationalVendors.length})
                </p>
                {nationalVendors.length > 0 && !showNational && (
                  <span
                    className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      selectAllNational()
                    }}
                  >
                    Select all
                  </span>
                )}
                {showNational ? (
                  <ChevronUp className="w-3.5 h-3.5 text-stone-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                )}
              </button>
              {showNational && (
                <div className="bg-stone-900 rounded-xl border border-stone-700 divide-y divide-stone-800 overflow-hidden">
                  {nationalVendors.map((vendor) => (
                    <VendorRow
                      key={vendor.id}
                      vendor={vendor}
                      selected={selected.has(vendor.id)}
                      callState={callStates[vendor.id] ?? { phase: 'idle' }}
                      onToggle={() => toggleVendor(vendor.id)}
                      onCall={() => placeCall(vendor)}
                    />
                  ))}
                </div>
              )}
              {!showNational && (
                <p className="text-xs text-stone-600 px-1">
                  {nationalVendors.filter((v) => selected.has(v.id)).length} of{' '}
                  {nationalVendors.length} selected
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!ingredient.trim() && (
        <div className="text-center py-12 text-stone-600">
          <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Type an ingredient to find vendors that carry it.</p>
          <p className="text-xs mt-1">
            We'll show your saved contacts first, then specialty vendors nearby.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single vendor row
// ---------------------------------------------------------------------------

function VendorRow({
  vendor,
  selected,
  callState,
  onToggle,
  onCall,
}: {
  vendor: VendorCallCandidate
  selected: boolean
  callState: CallState
  onToggle: () => void
  onCall: () => void
}) {
  const typeColor = TYPE_COLORS[vendor.vendor_type] || 'bg-stone-800 text-stone-400'
  const isDone = callState.phase === 'done'
  const isCalling = callState.phase === 'calling'

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
        selected && !isDone ? 'bg-violet-950/20' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        disabled={isDone || isCalling}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
          ${isDone || isCalling ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
          ${selected ? 'bg-violet-600 border-violet-600' : 'border-stone-600 bg-transparent hover:border-stone-400'}`}
      >
        {selected && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Vendor info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-stone-200 truncate">{vendor.name}</span>
          {vendor.is_preferred && (
            <Star className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" />
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${typeColor}`}>
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
          {vendor.contact_name && (
            <span className="text-xs text-stone-500">Attn: {vendor.contact_name}</span>
          )}
        </div>
      </div>

      {/* Call result / action */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {callState.phase === 'idle' && (
          <button
            type="button"
            onClick={onCall}
            disabled={!selected}
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
}
