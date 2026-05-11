'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSSE } from '@/lib/realtime/sse-client'
import { resolveIngredientAvailability } from '@/lib/calling/ingredient-resolution'
import {
  createSourcingSession,
  startSourcingSession,
  placeSessionCall,
  pauseSourcingSession,
  completeSourcingSession,
  cancelSourcingSession,
  getSourcingSession,
  getSessionSummary,
} from '@/lib/calling/sourcing-session-actions'
import { estimateSessionCost } from '@/lib/calling/cost-tracker'
import { toast } from 'sonner'
import {
  Phone,
  Search,
  Loader2,
  X,
  Check,
  AlertCircle,
  Play,
  Pause,
  Square,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Trash2,
  Plus,
  Settings2,
} from '@/components/ui/icons'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SessionPhase = 'search' | 'configure' | 'active' | 'complete'

type CandidateStatus = 'pending' | 'calling' | 'completed' | 'no_answer' | 'skipped' | 'failed'

type Candidate = {
  id?: string
  vendorId?: string
  vendorName: string
  vendorPhone: string
  vendorType: 'saved' | 'directory' | 'adhoc'
  priorityOrder: number
  status: CandidateStatus
  result?: string | null
  priceQuoted?: string | null
  priceCents?: number | null
  canHold?: boolean | null
  durationSeconds?: number | null
}

type SessionConfig = {
  stopAfterConfirmations: number
  askPrice: boolean
  askHold: boolean
  leaveVoicemail: boolean
}

type SessionSummary = {
  confirmed: Candidate[]
  unavailable: Candidate[]
  noAnswer: Candidate[]
  skipped: Candidate[]
  totalCalls: number
  totalTimeSeconds: number
  totalCostCents: number
  bestPrice?: { vendor: string; price: string }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  tenantId: string
}

// ---------------------------------------------------------------------------
// SourcingSession Component
// ---------------------------------------------------------------------------

export function SourcingSession({ tenantId }: Props) {
  const [phase, setPhase] = useState<SessionPhase>('search')
  const [ingredient, setIngredient] = useState('')
  const [resolving, setResolving] = useState(false)
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [resolvedCount, setResolvedCount] = useState(0)
  const [partialCount, setPartialCount] = useState(0)

  // Candidate list (draft and active)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [config, setConfig] = useState<SessionConfig>({
    stopAfterConfirmations: 3,
    askPrice: true,
    askHold: false,
    leaveVoicemail: false,
  })
  const [configOpen, setConfigOpen] = useState(false)

  // Add vendor form
  const [addName, setAddName] = useState('')
  const [addPhone, setAddPhone] = useState('')

  // Active session
  const sessionIdRef = useRef<string | null>(null)
  const [callsPlaced, setCallsPlaced] = useState(0)
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [unavailableCount, setUnavailableCount] = useState(0)
  const [costCents, setCostCents] = useState(0)
  const [sessionPaused, setSessionPaused] = useState(false)
  const [starting, setStarting] = useState(false)

  // Complete
  const [summary, setSummary] = useState<SessionSummary | null>(null)

  // Expand/collapse in results
  const [showUnavailable, setShowUnavailable] = useState(false)
  const [showNoAnswer, setShowNoAnswer] = useState(false)

  // Debounce ref for ingredient search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // -------------------------------------------------------------------------
  // SSE: live call results
  // -------------------------------------------------------------------------

  useSSE(`chef-${tenantId}`, {
    enabled: phase === 'active',
    onMessage: useCallback((msg: { event: string; data: any }) => {
      if (msg.event !== 'supplier_call_result') return
      const { candidateId, result, priceQuoted, priceCents, canHold, durationSeconds } = msg.data

      setCandidates((prev) =>
        prev.map((c) => {
          if (c.id !== candidateId) return c
          return {
            ...c,
            status: 'completed' as CandidateStatus,
            result,
            priceQuoted,
            priceCents,
            canHold,
            durationSeconds,
          }
        })
      )

      if (result === 'confirmed') {
        setConfirmedCount((prev) => prev + 1)
      } else if (result === 'unavailable') {
        setUnavailableCount((prev) => prev + 1)
      }
    }, []),
  })

  // -------------------------------------------------------------------------
  // Phase 1: Ingredient search with debounce
  // -------------------------------------------------------------------------

  const handleIngredientChange = (value: string) => {
    setIngredient(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) return

    debounceRef.current = setTimeout(async () => {
      setResolving(true)
      try {
        const res = await resolveIngredientAvailability(value.trim())
        if (res) {
          setResolvedCount(res.resolvedCount)
          setPartialCount(res.partialCount)
          setUnresolvedCount(res.unresolvedCount)

          // Map unresolved to candidates
          const mapped: Candidate[] = (res.unresolved || []).map((v, idx) => ({
            vendorId: v.id || undefined,
            vendorName: v.name,
            vendorPhone: v.phone || '',
            vendorType: (v.vendor_type as 'saved' | 'directory' | 'adhoc') || 'directory',
            priorityOrder: idx + 1,
            status: 'pending' as CandidateStatus,
          }))
          setCandidates(mapped)
        }
      } catch (err) {
        toast.error('Failed to resolve ingredient availability')
      } finally {
        setResolving(false)
      }
    }, 500)
  }

  const proceedToConfigure = () => {
    if (candidates.length === 0) {
      toast.error('No vendors to call for this ingredient')
      return
    }
    setPhase('configure')
  }

  // -------------------------------------------------------------------------
  // Phase 2: Configuration helpers
  // -------------------------------------------------------------------------

  const removeCandidate = (idx: number) => {
    setCandidates((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((c, i) => ({
          ...c,
          priorityOrder: i + 1,
        }))
    )
  }

  const moveCandidate = (idx: number, direction: 'up' | 'down') => {
    setCandidates((prev) => {
      const arr = [...prev]
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr.map((c, i) => ({ ...c, priorityOrder: i + 1 }))
    })
  }

  const handleAddVendor = () => {
    if (!addName.trim() || !addPhone.trim()) {
      toast.error('Name and phone are required')
      return
    }
    setCandidates((prev) => [
      ...prev,
      {
        vendorName: addName.trim(),
        vendorPhone: addPhone.trim(),
        vendorType: 'adhoc',
        priorityOrder: prev.length + 1,
        status: 'pending',
      },
    ])
    setAddName('')
    setAddPhone('')
  }

  const estimatedCost = estimateSessionCost(candidates.length)

  // -------------------------------------------------------------------------
  // Phase 3: Start and manage active session
  // -------------------------------------------------------------------------

  const handleStart = async () => {
    setStarting(true)
    try {
      const res = await createSourcingSession({
        ingredientQuery: ingredient.trim(),
        stopAfterConfirmations: config.stopAfterConfirmations,
        askPrice: config.askPrice,
        askHold: config.askHold,
        leaveVoicemail: config.leaveVoicemail,
        candidates: candidates.map((c) => ({
          vendorId: c.vendorId,
          vendorName: c.vendorName,
          vendorPhone: c.vendorPhone,
          vendorType: c.vendorType,
          priorityOrder: c.priorityOrder,
        })),
      })

      if (!res.success) {
        toast.error(res.error || 'Failed to create session')
        setStarting(false)
        return
      }

      sessionIdRef.current = res.data.sessionId

      // Start the session
      const startRes = await startSourcingSession(res.data.sessionId)
      if (!startRes.success) {
        toast.error(startRes.error || 'Failed to start session')
        setStarting(false)
        return
      }

      // Update candidates with IDs from server
      if (startRes.data?.candidates) {
        setCandidates(
          startRes.data.candidates.map((c: any) => ({
            id: c.id,
            vendorId: c.vendor_id,
            vendorName: c.vendor_name,
            vendorPhone: c.vendor_phone,
            vendorType: c.vendor_type,
            priorityOrder: c.priority_order,
            status: c.status,
            result: c.result,
            priceQuoted: c.price_quoted,
            priceCents: c.price_cents,
            canHold: c.can_hold,
            durationSeconds: c.duration_seconds,
          }))
        )
      }

      setPhase('active')
      setStarting(false)

      // Begin placing calls sequentially
      placeCalls(res.data.sessionId, startRes.data?.candidates || [])
    } catch (err) {
      toast.error('Failed to start sourcing session')
      setStarting(false)
    }
  }

  const placeCalls = async (sessionId: string, serverCandidates: any[]) => {
    for (const candidate of serverCandidates) {
      if (candidate.status !== 'pending') continue

      // Check if session was paused or cancelled
      const sessionCheck = await getSourcingSession(sessionId)
      if (!sessionCheck.success) break
      if (
        sessionCheck.data.status === 'paused' ||
        sessionCheck.data.status === 'completed' ||
        sessionCheck.data.status === 'cancelled'
      )
        break

      // Check stop condition client-side
      const currentConfirmed = sessionCheck.data.total_confirmed ?? 0
      if (currentConfirmed >= config.stopAfterConfirmations) break

      // Update candidate to calling
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id ? { ...c, status: 'calling' as CandidateStatus } : c
        )
      )

      const callRes = await placeSessionCall(sessionId, candidate.id)
      setCallsPlaced((prev) => prev + 1)

      if (!callRes.success) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidate.id ? { ...c, status: 'skipped' as CandidateStatus } : c
          )
        )
      }

      // Wait for the call to resolve (poll or SSE will update)
      await waitForCandidateResult(sessionId, candidate.id)
    }

    // After all calls placed, check session status
    if (sessionIdRef.current) {
      const finalCheck = await getSourcingSession(sessionIdRef.current)
      if (finalCheck.success && finalCheck.data.status !== 'completed') {
        await completeSourcingSession(sessionIdRef.current)
      }
      loadSummary(sessionIdRef.current)
    }
  }

  const waitForCandidateResult = async (sessionId: string, candidateId: string): Promise<void> => {
    // Poll for up to 90 seconds (AI calls take time)
    for (let i = 0; i < 18; i++) {
      await new Promise((r) => setTimeout(r, 5000))
      const res = await getSourcingSession(sessionId)
      if (!res.success) return

      const candidate = res.data.candidates?.find((c: any) => c.id === candidateId)
      if (candidate && candidate.status !== 'calling') {
        // Update local state
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidateId
              ? {
                  ...c,
                  status: candidate.status,
                  result: candidate.result,
                  priceQuoted: candidate.price_quoted,
                  priceCents: candidate.price_cents,
                  canHold: candidate.can_hold,
                  durationSeconds: candidate.duration_seconds,
                }
              : c
          )
        )

        if (candidate.result === 'confirmed') setConfirmedCount((prev) => prev + 1)
        if (candidate.result === 'unavailable') setUnavailableCount((prev) => prev + 1)

        // Update cost
        setCostCents(res.data.costSummary?.actualCents || 0)
        return
      }

      // Check if session completed externally (stop condition)
      if (res.data.status === 'completed' || res.data.status === 'cancelled') return
    }
  }

  const handlePause = async () => {
    if (!sessionIdRef.current) return
    const res = await pauseSourcingSession(sessionIdRef.current)
    if (res.success) {
      setSessionPaused(true)
      toast.success('Session paused')
    } else {
      toast.error(res.error || 'Failed to pause')
    }
  }

  const handleStop = async () => {
    if (!sessionIdRef.current) return
    const res = await completeSourcingSession(sessionIdRef.current)
    if (res.success) {
      loadSummary(sessionIdRef.current)
    } else {
      toast.error(res.error || 'Failed to stop session')
    }
  }

  // -------------------------------------------------------------------------
  // Phase 4: Summary
  // -------------------------------------------------------------------------

  const loadSummary = async (sessionId: string) => {
    const res = await getSessionSummary(sessionId)
    if (!res.success) {
      // Fallback: build from local state
      setPhase('complete')
      return
    }

    const data = res.data
    const confirmed = (data.candidates || []).filter((c: any) => c.result === 'confirmed')
    const unavailable = (data.candidates || []).filter((c: any) => c.result === 'unavailable')
    const noAnswer = (data.candidates || []).filter((c: any) => c.result === 'no_answer')
    const skipped = (data.candidates || []).filter((c: any) => c.status === 'skipped')

    // Find best price among confirmed
    const withPrice = confirmed.filter((c: any) => c.price_cents)
    const cheapest = withPrice.sort((a: any, b: any) => a.price_cents - b.price_cents)[0]

    const totalTime = (data.candidates || []).reduce(
      (acc: number, c: any) => acc + (c.duration_seconds || 0),
      0
    )

    setSummary({
      confirmed: confirmed.map(mapServerCandidate),
      unavailable: unavailable.map(mapServerCandidate),
      noAnswer: noAnswer.map(mapServerCandidate),
      skipped: skipped.map(mapServerCandidate),
      totalCalls: data.candidates?.length || 0,
      totalTimeSeconds: totalTime,
      totalCostCents: data.actual_cost_cents || 0,
      bestPrice: cheapest
        ? {
            vendor: cheapest.vendor_name,
            price: cheapest.price_quoted || `$${(cheapest.price_cents / 100).toFixed(2)}`,
          }
        : undefined,
    })

    setPhase('complete')
  }

  const mapServerCandidate = (c: any): Candidate => ({
    id: c.id,
    vendorId: c.vendor_id,
    vendorName: c.vendor_name,
    vendorPhone: c.vendor_phone,
    vendorType: c.vendor_type,
    priorityOrder: c.priority_order,
    status: c.status,
    result: c.result,
    priceQuoted: c.price_quoted,
    priceCents: c.price_cents,
    canHold: c.can_hold,
    durationSeconds: c.duration_seconds,
  })

  const handleNewSearch = () => {
    setPhase('search')
    setIngredient('')
    setCandidates([])
    setResolvedCount(0)
    setPartialCount(0)
    setUnresolvedCount(0)
    setCallsPlaced(0)
    setConfirmedCount(0)
    setUnavailableCount(0)
    setCostCents(0)
    setSessionPaused(false)
    setSummary(null)
    sessionIdRef.current = null
  }

  const handleRetryNoAnswer = async () => {
    if (!summary || summary.noAnswer.length === 0) return
    setCandidates(
      summary.noAnswer.map((c, i) => ({ ...c, status: 'pending', priorityOrder: i + 1 }))
    )
    setPhase('configure')
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Render: Phase 1 - Search
  // -------------------------------------------------------------------------

  if (phase === 'search') {
    return (
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
          <input
            type="text"
            value={ingredient}
            onChange={(e) => handleIngredientChange(e.target.value)}
            placeholder="What ingredient are you sourcing?"
            className="w-full pl-12 pr-4 py-4 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 text-lg placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            autoFocus
          />
          {resolving && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-violet-400 animate-spin" />
          )}
        </div>

        {/* Resolution summary */}
        {ingredient.trim() &&
          !resolving &&
          (resolvedCount > 0 || partialCount > 0 || unresolvedCount > 0) && (
            <div className="bg-stone-900 border border-stone-700 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-stone-300">Resolution Results</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-emerald-950/50 border border-emerald-800/50">
                  <p className="text-2xl font-bold text-emerald-400">{resolvedCount}</p>
                  <p className="text-xs text-emerald-300/70">Confirmed</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-950/50 border border-amber-800/50">
                  <p className="text-2xl font-bold text-amber-400">{partialCount}</p>
                  <p className="text-xs text-amber-300/70">Partial</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-violet-950/50 border border-violet-800/50">
                  <p className="text-2xl font-bold text-violet-400">{unresolvedCount}</p>
                  <p className="text-xs text-violet-300/70">Need calls</p>
                </div>
              </div>
              {unresolvedCount > 0 && (
                <button
                  onClick={proceedToConfigure}
                  className="w-full mt-2 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Configure {unresolvedCount} call{unresolvedCount !== 1 ? 's' : ''}
                </button>
              )}
              {unresolvedCount === 0 && resolvedCount > 0 && (
                <p className="text-sm text-emerald-400 text-center">
                  All vendors resolved. No calls needed.
                </p>
              )}
            </div>
          )}
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: Phase 2 - Configure
  // -------------------------------------------------------------------------

  if (phase === 'configure') {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-100">
            {ingredient}{' '}
            <span className="text-stone-400 font-normal">
              ({candidates.length} vendor{candidates.length !== 1 ? 's' : ''} to call)
            </span>
          </h2>
          <button
            onClick={handleNewSearch}
            className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Candidate list */}
        <div className="bg-stone-900 border border-stone-700 rounded-xl divide-y divide-stone-700/50">
          {candidates.map((c, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveCandidate(idx, 'up')}
                  disabled={idx === 0}
                  className="text-stone-500 hover:text-stone-300 disabled:opacity-20"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => moveCandidate(idx, 'down')}
                  disabled={idx === candidates.length - 1}
                  className="text-stone-500 hover:text-stone-300 disabled:opacity-20"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <GripVertical className="h-4 w-4 text-stone-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-200 truncate">{c.vendorName}</p>
                <p className="text-xs text-stone-400">{c.vendorPhone}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  c.vendorType === 'saved'
                    ? 'bg-violet-900/60 text-violet-300 border border-violet-700/50'
                    : c.vendorType === 'directory'
                      ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                      : 'bg-stone-800 text-stone-400 border border-stone-600'
                }`}
              >
                {c.vendorType}
              </span>
              <button
                onClick={() => removeCandidate(idx)}
                className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add vendor */}
        <div className="flex gap-2">
          <input
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="Vendor name"
            className="flex-1 px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <input
            type="tel"
            value={addPhone}
            onChange={(e) => setAddPhone(e.target.value)}
            placeholder="Phone number"
            className="flex-1 px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button
            onClick={handleAddVendor}
            className="px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-300 hover:bg-stone-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Config panel (collapsible) */}
        <div className="bg-stone-900 border border-stone-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-stone-300 hover:bg-stone-800/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-stone-400" />
              Session settings
            </span>
            {configOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {configOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-stone-700/50">
              <div className="flex items-center justify-between pt-3">
                <label className="text-sm text-stone-300">Stop after confirmations</label>
                <input
                  type="number"
                  min={1}
                  max={candidates.length}
                  value={config.stopAfterConfirmations}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      stopAfterConfirmations: parseInt(e.target.value) || 3,
                    }))
                  }
                  className="w-16 px-2 py-1 bg-stone-800 border border-stone-600 rounded text-sm text-stone-200 text-center focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.askPrice}
                  onChange={(e) => setConfig((c) => ({ ...c, askPrice: e.target.checked }))}
                  className="rounded border-stone-600 bg-stone-800 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-stone-300">Ask price</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.askHold}
                  onChange={(e) => setConfig((c) => ({ ...c, askHold: e.target.checked }))}
                  className="rounded border-stone-600 bg-stone-800 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-stone-300">Ask to hold</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.leaveVoicemail}
                  onChange={(e) => setConfig((c) => ({ ...c, leaveVoicemail: e.target.checked }))}
                  className="rounded border-stone-600 bg-stone-800 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-stone-300">Leave voicemail</span>
              </label>
            </div>
          )}
        </div>

        {/* Cost estimate */}
        <div className="flex items-center gap-2 text-sm text-stone-400">
          <DollarSign className="h-4 w-4" />
          <span>
            Estimated cost: ~${(estimatedCost / 100).toFixed(2)} ({candidates.length} calls x ~30s
            avg)
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleStart}
            disabled={starting || candidates.length === 0}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 disabled:text-stone-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
            {starting ? 'Starting...' : 'Start Sourcing'}
          </button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: Phase 3 - Active Session
  // -------------------------------------------------------------------------

  if (phase === 'active') {
    const totalCandidates = candidates.length
    const processed = candidates.filter(
      (c) => c.status !== 'pending' && c.status !== 'calling'
    ).length

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-100">
            {ingredient} <span className="text-stone-400 font-normal">Sourcing in progress</span>
          </h2>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-stone-400">
            <span>
              {callsPlaced}/{totalCandidates} calls placed
            </span>
            <span>
              {confirmedCount} confirmed, {unavailableCount} unavailable
            </span>
          </div>
          <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all duration-500 rounded-full"
              style={{ width: `${(processed / totalCandidates) * 100}%` }}
            />
          </div>
        </div>

        {/* Candidate cards */}
        <div className="space-y-2">
          {candidates.map((c) => (
            <div
              key={c.id || c.vendorPhone}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                c.status === 'calling'
                  ? 'bg-blue-950/30 border-blue-500 animate-pulse'
                  : c.status === 'completed' && c.result === 'confirmed'
                    ? 'bg-emerald-950/30 border-emerald-600'
                    : c.status === 'completed' && c.result === 'unavailable'
                      ? 'bg-rose-950/30 border-rose-600'
                      : c.status === 'no_answer' || c.result === 'no_answer'
                        ? 'bg-amber-950/20 border-amber-600/50'
                        : c.status === 'skipped'
                          ? 'bg-stone-900/50 border-stone-700 opacity-50'
                          : 'bg-stone-900 border-stone-700'
              }`}
            >
              {/* Status icon */}
              <div className="flex-shrink-0">
                {c.status === 'calling' && <Phone className="h-4 w-4 text-blue-400" />}
                {c.status === 'completed' && c.result === 'confirmed' && (
                  <Check className="h-4 w-4 text-emerald-400" />
                )}
                {c.status === 'completed' && c.result === 'unavailable' && (
                  <X className="h-4 w-4 text-rose-400" />
                )}
                {(c.status === 'no_answer' || c.result === 'no_answer') && (
                  <Clock className="h-4 w-4 text-amber-400" />
                )}
                {c.status === 'skipped' && <AlertCircle className="h-4 w-4 text-stone-500" />}
                {c.status === 'pending' && (
                  <div className="h-4 w-4 rounded-full border-2 border-stone-600" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-200 truncate">{c.vendorName}</p>
                <p className="text-xs text-stone-400">
                  {c.status === 'calling' && 'Calling...'}
                  {c.status === 'pending' && 'Waiting'}
                  {c.status === 'completed' &&
                    c.result === 'confirmed' &&
                    (c.priceQuoted ? `In stock: ${c.priceQuoted}` : 'In stock')}
                  {c.status === 'completed' && c.result === 'unavailable' && 'Out of stock'}
                  {(c.status === 'no_answer' || c.result === 'no_answer') && 'No answer'}
                  {c.status === 'skipped' && 'Skipped'}
                </p>
              </div>

              {/* Hold badge */}
              {c.canHold && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-900/60 text-violet-300 border border-violet-700/50">
                  Hold
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Cost ticker */}
        <div className="flex items-center gap-2 text-sm text-stone-400">
          <DollarSign className="h-4 w-4" />
          <span>Cost so far: ${(costCents / 100).toFixed(2)}</span>
        </div>

        {/* Stop condition message */}
        {confirmedCount >= config.stopAfterConfirmations && (
          <div className="text-center py-2 text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-800/50 rounded-lg">
            {confirmedCount} confirmed. Stopping remaining calls.
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={handlePause}
            disabled={sessionPaused}
            className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Pause className="h-4 w-4" />
            Pause
          </button>
          <button
            onClick={handleStop}
            className="flex-1 py-3 bg-rose-900/80 hover:bg-rose-800 border border-rose-700/50 text-rose-100 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: Phase 4 - Results Summary
  // -------------------------------------------------------------------------

  if (phase === 'complete') {
    const confirmedList = summary?.confirmed || candidates.filter((c) => c.result === 'confirmed')
    const sortedConfirmed = [...confirmedList].sort(
      (a, b) => (a.priceCents || 999999) - (b.priceCents || 999999)
    )
    const unavailableList =
      summary?.unavailable || candidates.filter((c) => c.result === 'unavailable')
    const noAnswerList = summary?.noAnswer || candidates.filter((c) => c.result === 'no_answer')

    return (
      <div className="space-y-5">
        {/* Main result card */}
        <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-stone-100">
            Found {ingredient} at {sortedConfirmed.length} location
            {sortedConfirmed.length !== 1 ? 's' : ''}
          </h2>

          {/* Best price */}
          {summary?.bestPrice && (
            <div className="py-2 px-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg">
              <p className="text-sm text-emerald-300">
                Best price: {summary.bestPrice.price} at {summary.bestPrice.vendor}
              </p>
            </div>
          )}

          {/* Confirmed vendors */}
          {sortedConfirmed.length > 0 && (
            <div className="space-y-2">
              {sortedConfirmed.map((c) => (
                <div
                  key={c.id || c.vendorPhone}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-950/20 border border-emerald-800/30"
                >
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-stone-200">{c.vendorName}</span>
                  </div>
                  {c.priceQuoted && (
                    <span className="text-sm font-medium text-emerald-300">{c.priceQuoted}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Out of stock (collapsed) */}
          {unavailableList.length > 0 && (
            <div>
              <button
                onClick={() => setShowUnavailable(!showUnavailable)}
                className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-300 transition-colors"
              >
                {showUnavailable ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {unavailableList.length} out of stock
              </button>
              {showUnavailable && (
                <div className="mt-2 space-y-1">
                  {unavailableList.map((c) => (
                    <div
                      key={c.id || c.vendorPhone}
                      className="flex items-center gap-2 py-1 px-3 text-sm text-stone-400"
                    >
                      <X className="h-3 w-3 text-rose-400" />
                      <span>{c.vendorName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No answer (collapsed) */}
          {noAnswerList.length > 0 && (
            <div>
              <button
                onClick={() => setShowNoAnswer(!showNoAnswer)}
                className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-300 transition-colors"
              >
                {showNoAnswer ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {noAnswerList.length} no answer
              </button>
              {showNoAnswer && (
                <div className="mt-2 space-y-1">
                  {noAnswerList.map((c) => (
                    <div
                      key={c.id || c.vendorPhone}
                      className="flex items-center gap-2 py-1 px-3 text-sm text-stone-400"
                    >
                      <Clock className="h-3 w-3 text-amber-400" />
                      <span>{c.vendorName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center py-3 bg-stone-900 border border-stone-700 rounded-xl">
            <p className="text-lg font-bold text-stone-200">{summary?.totalCalls || callsPlaced}</p>
            <p className="text-xs text-stone-400">Calls</p>
          </div>
          <div className="text-center py-3 bg-stone-900 border border-stone-700 rounded-xl">
            <p className="text-lg font-bold text-stone-200">
              {Math.floor((summary?.totalTimeSeconds || 0) / 60)}m{' '}
              {(summary?.totalTimeSeconds || 0) % 60}s
            </p>
            <p className="text-xs text-stone-400">Duration</p>
          </div>
          <div className="text-center py-3 bg-stone-900 border border-stone-700 rounded-xl">
            <p className="text-lg font-bold text-stone-200">
              ${((summary?.totalCostCents || costCents) / 100).toFixed(2)}
            </p>
            <p className="text-xs text-stone-400">Cost</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleNewSearch}
            className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
          >
            New Search
          </button>
          {noAnswerList.length > 0 && (
            <button
              onClick={handleRetryNoAnswer}
              className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 font-medium rounded-xl transition-colors"
            >
              Retry No-Answer ({noAnswerList.length})
            </button>
          )}
        </div>
      </div>
    )
  }

  return null
}
