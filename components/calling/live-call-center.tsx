'use client'

/**
 * Live Call Center
 *
 * Real-time call visualization panel that shows active calls with visual
 * feedback, inline transcripts, and control buttons. Listens to SSE events
 * on the calling channel and renders call cards with status animations.
 *
 * Auto-shows when calls are initiated, can be minimized to a floating bar,
 * and hides when all calls are completed and dismissed.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSSE } from '@/lib/realtime/sse-client'
import { toast } from 'sonner'
import { retryCall, skipCall, endCall } from '@/lib/calling/sourcing-session-actions'
import { CallProgressBar } from './call-progress-bar'
import {
  Phone,
  PhoneCall,
  Check,
  X,
  Clock,
  AlertCircle,
  Mic,
  Loader2,
  Volume2,
  ChevronDown,
  ChevronUp,
  Minimize2,
  Maximize2,
  SkipForward,
} from '@/components/ui/icons'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

type CallEventType =
  | 'call_initiated'
  | 'call_ringing'
  | 'call_connected'
  | 'call_completed'
  | 'call_failed'
  | 'transcript_update'
  | 'voicemail'

interface CallEvent {
  type: CallEventType
  callId: string
  vendorName: string
  vendorPhone: string
  ingredient?: string
  transcript?: string
  result?: 'yes' | 'no' | null
  price?: string
  duration?: number
}

type CallStatus = 'queued' | 'ringing' | 'connected' | 'voicemail' | 'completed' | 'failed'

interface CallState {
  callId: string
  vendorName: string
  vendorPhone: string
  ingredient?: string
  status: CallStatus
  result?: 'yes' | 'no' | null
  price?: string
  duration?: number
  transcript: string[]
  startedAt?: number
  connectedAt?: number
}

interface LiveCallCenterProps {
  chefId: string
  onClose?: () => void
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function LiveCallCenter({ chefId, onClose }: LiveCallCenterProps) {
  const [calls, setCalls] = useState<Map<string, CallState>>(new Map())
  const [minimized, setMinimized] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [soundEnabled, setSoundEnabled] = useState(true)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------------
  // Timer: updates elapsed seconds for connected calls
  // ---------------------------------------------------------------
  const [, setTick] = useState(0)
  useEffect(() => {
    const hasActiveCalls = Array.from(calls.values()).some(
      (c) => c.status === 'connected' || c.status === 'ringing'
    )
    if (!hasActiveCalls) return

    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [calls])

  // ---------------------------------------------------------------
  // Sound helper
  // ---------------------------------------------------------------
  const playChime = useCallback(() => {
    if (!soundEnabled) return
    try {
      new Audio('/sounds/chime.mp3').play().catch(() => {
        // File may not exist; silently ignore
      })
    } catch {
      // Audio constructor not available (SSR safety)
    }
  }, [soundEnabled])

  // ---------------------------------------------------------------
  // SSE message handler
  // ---------------------------------------------------------------
  const handleMessage = useCallback(
    (msg: { event: string; data: any }) => {
      const data = msg.data as CallEvent
      if (!data?.callId) return

      setCalls((prev) => {
        const next = new Map(prev)
        const existing = next.get(data.callId)

        switch (data.type) {
          case 'call_initiated': {
            next.set(data.callId, {
              callId: data.callId,
              vendorName: data.vendorName || 'Unknown Vendor',
              vendorPhone: data.vendorPhone || '',
              ingredient: data.ingredient,
              status: 'queued',
              transcript: [],
              startedAt: Date.now(),
            })
            break
          }

          case 'call_ringing': {
            if (existing) {
              existing.status = 'ringing'
            } else {
              next.set(data.callId, {
                callId: data.callId,
                vendorName: data.vendorName || 'Unknown Vendor',
                vendorPhone: data.vendorPhone || '',
                ingredient: data.ingredient,
                status: 'ringing',
                transcript: [],
                startedAt: Date.now(),
              })
            }
            break
          }

          case 'call_connected': {
            if (existing) {
              existing.status = 'connected'
              existing.connectedAt = Date.now()
            }
            break
          }

          case 'call_completed': {
            if (existing) {
              existing.status = 'completed'
              existing.result = data.result
              existing.price = data.price
              existing.duration = data.duration
            }
            playChime()
            break
          }

          case 'call_failed': {
            if (existing) {
              existing.status = 'failed'
              existing.duration = data.duration
            }
            break
          }

          case 'transcript_update': {
            if (existing && data.transcript) {
              existing.transcript = [...existing.transcript, data.transcript]
            }
            break
          }

          case 'voicemail': {
            if (existing) {
              existing.status = 'voicemail'
              if (data.transcript) {
                existing.transcript = [...existing.transcript, data.transcript]
              }
            }
            break
          }
        }

        return next
      })
    },
    [playChime]
  )

  useSSE(`calling:${chefId}`, { onMessage: handleMessage })

  // ---------------------------------------------------------------
  // Derived stats
  // ---------------------------------------------------------------
  const callList = Array.from(calls.values())
  const total = callList.length
  const called = callList.filter((c) =>
    ['connected', 'completed', 'failed', 'voicemail'].includes(c.status)
  ).length
  const confirmed = callList.filter((c) => c.status === 'completed' && c.result === 'yes').length
  const unavailable = callList.filter((c) => c.status === 'completed' && c.result === 'no').length
  const failed = callList.filter((c) => c.status === 'failed').length
  const activeCalls = callList.filter((c) =>
    ['queued', 'ringing', 'connected', 'voicemail'].includes(c.status)
  )
  const completedCalls = callList.filter((c) => ['completed', 'failed'].includes(c.status))

  // Auto-hide when no calls exist
  if (total === 0) return null

  // ---------------------------------------------------------------
  // Card expand/collapse toggle
  // ---------------------------------------------------------------
  function toggleCard(callId: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(callId)) {
        next.delete(callId)
      } else {
        next.add(callId)
      }
      return next
    })
  }

  // ---------------------------------------------------------------
  // Placeholder action handlers (wire to server actions later)
  // ---------------------------------------------------------------
  async function handleRetry(callId: string) {
    toast.info('Retrying call...')
    try {
      const result = await retryCall(callId)
      if (!result.success) {
        toast.error(result.error || 'Failed to retry call')
        return
      }
      toast.success('Call retried successfully')
    } catch (err) {
      console.error('[live-call-center] handleRetry error:', err)
      toast.error('Failed to retry call')
    }
  }

  async function handleSkip(callId: string) {
    toast.info('Skipping to next vendor...')
    try {
      const result = await skipCall(callId)
      if (!result.success) {
        toast.error(result.error || 'Failed to skip call')
        return
      }
      toast.success('Vendor skipped')
    } catch (err) {
      console.error('[live-call-center] handleSkip error:', err)
      toast.error('Failed to skip call')
    }
  }

  async function handleEndCall(callId: string) {
    toast.info('Ending call...')
    try {
      const result = await endCall(callId)
      if (!result.success) {
        toast.error(result.error || 'Failed to end call')
        return
      }
      toast.success('Call ended')
    } catch (err) {
      console.error('[live-call-center] handleEndCall error:', err)
      toast.error('Failed to end call')
    }
  }

  // ---------------------------------------------------------------
  // Minimized floating bar
  // ---------------------------------------------------------------
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 rounded-full bg-stone-900 border border-stone-700 px-4 py-2 shadow-xl hover:bg-stone-800 transition-all duration-300"
          aria-label="Expand live call center"
        >
          <span className="relative flex h-2.5 w-2.5">
            {activeCalls.length > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                activeCalls.length > 0 ? 'bg-emerald-400' : 'bg-stone-500'
              }`}
            />
          </span>
          <span className="text-xs font-medium text-stone-200">
            {completedCalls.length}/{total} calls complete
          </span>
          <Maximize2 className="h-3.5 w-3.5 text-stone-400" />
        </button>
      </div>
    )
  }

  // ---------------------------------------------------------------
  // Full panel
  // ---------------------------------------------------------------
  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md">
      <div className="rounded-xl border border-stone-700 bg-stone-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {activeCalls.length > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  activeCalls.length > 0 ? 'bg-emerald-400' : 'bg-stone-500'
                }`}
              />
            </span>
            <h3 className="text-sm font-semibold text-stone-100">Live Calls</h3>
            <span className="text-xs text-stone-500">({activeCalls.length} active)</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded text-stone-400 hover:text-stone-200 transition-colors"
              aria-label={soundEnabled ? 'Mute call sounds' : 'Unmute call sounds'}
            >
              <Volume2 className={`h-3.5 w-3.5 ${soundEnabled ? '' : 'opacity-40'}`} />
            </button>
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="p-1.5 rounded text-stone-400 hover:text-stone-200 transition-colors"
              aria-label="Minimize live call center"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded text-stone-400 hover:text-stone-200 transition-colors"
                aria-label="Close live call center"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Call cards (scrollable) */}
        <div className="max-h-[420px] overflow-y-auto p-3 space-y-2">
          {/* Active calls first, then completed */}
          {[...activeCalls, ...completedCalls].map((call) => (
            <CallCard
              key={call.callId}
              call={call}
              expanded={expandedCards.has(call.callId)}
              onToggle={() => toggleCard(call.callId)}
              onRetry={() => handleRetry(call.callId)}
              onSkip={() => handleSkip(call.callId)}
              onEndCall={() => handleEndCall(call.callId)}
            />
          ))}
        </div>

        {/* Progress bar */}
        {total > 1 && (
          <div className="px-4 py-3 border-t border-stone-800">
            <CallProgressBar
              total={total}
              called={called + failed}
              confirmed={confirmed}
              unavailable={unavailable}
              failed={failed}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------------------
// Call Card
// -------------------------------------------------------------------

interface CallCardProps {
  call: CallState
  expanded: boolean
  onToggle: () => void
  onRetry: () => void
  onSkip: () => void
  onEndCall: () => void
}

function CallCard({ call, expanded, onToggle, onRetry, onSkip, onEndCall }: CallCardProps) {
  const transcriptRef = useRef<HTMLDivElement>(null)

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (expanded && transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [call.transcript.length, expanded])

  const borderColor = statusBorderColor(call.status, call.result)
  const isActive = ['queued', 'ringing', 'connected', 'voicemail'].includes(call.status)

  return (
    <div
      className={`rounded-lg border shadow-sm transition-all duration-300 bg-stone-850 ${borderColor}`}
      style={{ backgroundColor: 'rgb(28 25 23 / 0.8)' }}
    >
      {/* Card header (always visible) */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
        aria-label={`${call.vendorName}: ${statusLabel(call)}`}
        aria-expanded={expanded}
      >
        {/* Status icon */}
        <div className="shrink-0">
          <StatusIcon status={call.status} result={call.result} />
        </div>

        {/* Vendor info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-100 truncate">{call.vendorName}</p>
          <p className="text-xs text-stone-400 mt-0.5">{statusLabel(call)}</p>
        </div>

        {/* Ingredient badge */}
        {call.ingredient && (
          <span className="shrink-0 text-[10px] font-medium bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full border border-stone-700">
            {call.ingredient}
          </span>
        )}

        {/* Expand chevron */}
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-stone-500 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-stone-500 shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-stone-800/50">
          {/* Waveform indicator for connected calls */}
          {call.status === 'connected' && (
            <div className="flex items-center gap-1.5 pt-2">
              <Mic className="h-3 w-3 text-emerald-400" />
              <div className="flex items-end gap-[2px]" aria-label="Audio activity indicator">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-[3px] bg-emerald-400 rounded-full animate-pulse"
                    style={{
                      height: `${6 + Math.random() * 10}px`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: `${0.6 + Math.random() * 0.4}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-emerald-400/70 ml-1">Listening...</span>
            </div>
          )}

          {/* Transcript area */}
          {call.transcript.length > 0 && (
            <div
              ref={transcriptRef}
              className="max-h-24 overflow-y-auto rounded bg-stone-950/60 p-2 text-xs text-stone-300 leading-relaxed space-y-1"
              aria-label={`Transcript for ${call.vendorName}`}
            >
              {call.transcript.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}

          {/* Result display for completed calls */}
          {call.status === 'completed' && call.result && (
            <div
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                call.result === 'yes'
                  ? 'bg-emerald-950/50 text-emerald-300'
                  : 'bg-amber-950/50 text-amber-300'
              }`}
            >
              {call.result === 'yes' ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              <span>
                {call.result === 'yes' ? 'Available' : 'Unavailable'}
                {call.price ? ` - ${call.price}` : ''}
              </span>
            </div>
          )}

          {/* Duration for completed/failed */}
          {(call.status === 'completed' || call.status === 'failed') && call.duration != null && (
            <p className="text-[10px] text-stone-500">Duration: {formatDuration(call.duration)}</p>
          )}

          {/* Controls for active calls */}
          {isActive && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRetry()
                }}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
                aria-label={`Retry call to ${call.vendorName}`}
              >
                <Phone className="h-3 w-3" />
                Retry
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSkip()
                }}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
                aria-label={`Skip call to ${call.vendorName}`}
              >
                <SkipForward className="h-3 w-3" />
                Skip
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEndCall()
                }}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-red-900/50 text-red-300 hover:bg-red-900 hover:text-red-100 transition-colors"
                aria-label={`End call to ${call.vendorName}`}
              >
                <X className="h-3 w-3" />
                End
              </button>
            </div>
          )}

          {/* Retry for failed calls */}
          {call.status === 'failed' && (
            <div className="pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRetry()
                }}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
                aria-label={`Retry call to ${call.vendorName}`}
              >
                <Phone className="h-3 w-3" />
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------------
// Status helpers
// -------------------------------------------------------------------

function StatusIcon({ status, result }: { status: CallStatus; result?: 'yes' | 'no' | null }) {
  switch (status) {
    case 'queued':
      return <Clock className="h-4 w-4 text-stone-500" />
    case 'ringing':
      return <PhoneCall className="h-4 w-4 text-violet-400 animate-pulse" />
    case 'connected':
      return (
        <span className="relative flex h-4 w-4 items-center justify-center">
          <Phone className="h-4 w-4 text-emerald-400" />
        </span>
      )
    case 'voicemail':
      return <Volume2 className="h-4 w-4 text-amber-400" />
    case 'completed':
      return result === 'yes' ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : result === 'no' ? (
        <X className="h-4 w-4 text-amber-400" />
      ) : (
        <Check className="h-4 w-4 text-stone-400" />
      )
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-400" />
    default:
      return <Loader2 className="h-4 w-4 text-stone-500 animate-spin" />
  }
}

function statusLabel(call: CallState): string {
  switch (call.status) {
    case 'queued':
      return 'Queued'
    case 'ringing':
      return 'Ringing...'
    case 'connected': {
      const elapsed = call.connectedAt ? Math.floor((Date.now() - call.connectedAt) / 1000) : 0
      return `Connected ${formatDuration(elapsed)}`
    }
    case 'voicemail':
      return 'Voicemail'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    default:
      return 'Unknown'
  }
}

function statusBorderColor(status: CallStatus, result?: 'yes' | 'no' | null): string {
  switch (status) {
    case 'queued':
      return 'border-stone-700'
    case 'ringing':
      return 'border-l-4 border-l-violet-500 border-stone-700'
    case 'connected':
      return 'border-l-4 border-l-emerald-500 border-stone-700'
    case 'voicemail':
      return 'border-l-4 border-l-amber-500 border-stone-700'
    case 'completed':
      return result === 'yes'
        ? 'border-l-4 border-l-emerald-500 border-stone-700'
        : result === 'no'
          ? 'border-l-4 border-l-amber-500 border-stone-700'
          : 'border-stone-700'
    case 'failed':
      return 'border-l-4 border-l-red-500 border-stone-700'
    default:
      return 'border-stone-700'
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
