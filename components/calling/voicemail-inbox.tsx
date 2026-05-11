'use client'

/**
 * Voicemail Inbox
 *
 * Dedicated voicemail inbox styled like an email inbox. Shows unhandled
 * voicemails first with bold styling, supports expanding for full transcript,
 * audio playback, and mark-as-handled with optimistic updates.
 */

import { useState, useTransition, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Phone,
  PhoneCall,
  Play,
  Pause,
  Check,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  Inbox,
  Eye,
} from '@/components/ui/icons'

// ---- Types ----------------------------------------------------------------

export interface VoicemailEntry {
  id: string
  caller_name: string | null
  caller_phone: string
  transcript: string | null
  recording_url: string | null
  received_at: string
  duration_seconds: number | null
  handled: boolean
  suggested_action: 'return_call' | 'ignore' | 'delegate' | null
}

interface VoicemailInboxProps {
  voicemails: VoicemailEntry[]
  onMarkHandled?: (id: string) => void
  onReturnCall?: (phone: string, name: string) => void
}

type FilterTab = 'all' | 'unhandled' | 'handled'

// ---- Helpers --------------------------------------------------------------

function fmtDuration(secs: number | null): string {
  if (!secs) return '0:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '...'
}

const SUGGESTED_ACTION_LABELS: Record<string, string> = {
  return_call: 'Return this call',
  ignore: 'Likely spam or solicitation',
  delegate: 'Consider delegating this',
}

const SUGGESTED_ACTION_COLORS: Record<string, string> = {
  return_call: 'bg-violet-950 border-violet-800 text-violet-200',
  ignore: 'bg-stone-800 border-stone-700 text-stone-400',
  delegate: 'bg-amber-950 border-amber-800 text-amber-200',
}

// ---- Voicemail Row --------------------------------------------------------

function VoicemailRow({
  vm,
  onMarkHandled,
  onReturnCall,
}: {
  vm: VoicemailEntry
  onMarkHandled?: (id: string) => void
  onReturnCall?: (phone: string, name: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [optimisticHandled, setOptimisticHandled] = useState(vm.handled)

  const handleMarkHandled = useCallback(() => {
    if (!onMarkHandled) return
    const prev = optimisticHandled
    setOptimisticHandled(true)
    startTransition(async () => {
      try {
        onMarkHandled(vm.id)
      } catch {
        setOptimisticHandled(prev)
      }
    })
  }, [onMarkHandled, vm.id, optimisticHandled])

  const handleReturnCall = useCallback(() => {
    if (!onReturnCall) return
    onReturnCall(vm.caller_phone, vm.caller_name || 'Unknown')
  }, [onReturnCall, vm.caller_phone, vm.caller_name])

  const isHandled = optimisticHandled

  return (
    <div className="border-b border-stone-800 last:border-0">
      {/* Row summary */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-800/50 cursor-pointer ${
          isPending ? 'opacity-60' : ''
        }`}
      >
        {/* Phone icon */}
        <span className="shrink-0 w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center">
          <Phone className={`w-4 h-4 ${isHandled ? 'text-stone-500' : 'text-violet-400'}`} />
        </span>

        {/* Caller info */}
        <span className="flex-1 min-w-0">
          <span
            className={`text-sm block truncate ${
              isHandled ? 'text-stone-400' : 'text-stone-100 font-semibold'
            }`}
          >
            {vm.caller_name || 'Unknown Caller'}
            <span className="text-xs text-stone-500 ml-2 font-normal">{vm.caller_phone}</span>
          </span>
          {vm.transcript && (
            <span
              className={`text-xs block truncate mt-0.5 ${
                isHandled ? 'text-stone-600' : 'text-stone-400'
              }`}
            >
              {truncate(vm.transcript, 80)}
            </span>
          )}
        </span>

        {/* Time */}
        <span className="text-xs text-stone-500 shrink-0 hidden sm:block">
          {formatDistanceToNow(new Date(vm.received_at), { addSuffix: true })}
        </span>

        {/* Duration */}
        {vm.duration_seconds != null && (
          <span className="text-xs text-stone-600 shrink-0 hidden md:flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {fmtDuration(vm.duration_seconds)}
          </span>
        )}

        {/* Handled badge */}
        {isHandled && (
          <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-500 shrink-0">
            Handled
          </span>
        )}

        {/* Expand chevron */}
        <span className="shrink-0 text-stone-600">
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-stone-900/50 space-y-3 border-t border-stone-800/50">
          {/* Full transcript */}
          {vm.transcript ? (
            <div className="bg-stone-800 rounded-lg p-3">
              <p className="text-stone-500 mb-1 text-xs font-medium uppercase tracking-wide">
                Transcript
              </p>
              <p className="text-stone-300 text-sm leading-relaxed">{vm.transcript}</p>
            </div>
          ) : (
            <p className="text-stone-600 text-xs italic">
              No transcript available for this voicemail.
            </p>
          )}

          {/* Audio player */}
          {vm.recording_url && (
            <div className="flex items-center gap-3">
              <audio controls preload="none" className="h-8 flex-1" style={{ maxWidth: '100%' }}>
                <source src={vm.recording_url} type="audio/mpeg" />
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {/* Suggested action card */}
          {vm.suggested_action && !isHandled && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                SUGGESTED_ACTION_COLORS[vm.suggested_action] ||
                'bg-stone-800 border-stone-700 text-stone-400'
              }`}
            >
              <span className="font-medium">Suggestion:</span>{' '}
              {SUGGESTED_ACTION_LABELS[vm.suggested_action] || vm.suggested_action}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {onReturnCall && (
              <button
                type="button"
                onClick={handleReturnCall}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Return Call
              </button>
            )}
            {!isHandled && onMarkHandled && (
              <button
                type="button"
                onClick={handleMarkHandled}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Mark Handled
              </button>
            )}
            {isHandled && onMarkHandled && (
              <button
                type="button"
                onClick={() => {
                  // Undo: mark as unhandled. The parent component should handle this
                  // by calling markVoicemailUnhandled server action.
                  setOptimisticHandled(false)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Mark Unhandled
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Main Component -------------------------------------------------------

export function VoicemailInbox({ voicemails, onMarkHandled, onReturnCall }: VoicemailInboxProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const unhandledCount = voicemails.filter((v) => !v.handled).length

  const filtered = voicemails
    .filter((v) => {
      if (activeTab === 'unhandled') return !v.handled
      if (activeTab === 'handled') return v.handled
      return true
    })
    // Always show unhandled first within each filter
    .sort((a, b) => {
      if (a.handled !== b.handled) return a.handled ? 1 : -1
      return new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    })

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: voicemails.length },
    { key: 'unhandled', label: 'Unhandled', count: unhandledCount },
    { key: 'handled', label: 'Handled', count: voicemails.length - unhandledCount },
  ]

  if (voicemails.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="px-6 py-16 text-center">
          <Phone className="w-8 h-8 text-stone-600 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">No voicemails</p>
          <p className="text-stone-600 text-xs mt-1">
            Voicemails from vendors and callers will appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-semibold text-stone-200">Voicemails</span>
          {unhandledCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-600 text-white font-medium">
              {unhandledCount}
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-stone-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-violet-400 border-b-2 border-violet-400 bg-stone-900/50'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="ml-1 text-stone-600">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Voicemail list */}
      {filtered.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-stone-500 text-sm">
            {activeTab === 'unhandled'
              ? 'All voicemails have been handled.'
              : 'No handled voicemails yet.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-stone-800">
          {filtered.map((vm) => (
            <VoicemailRow
              key={vm.id}
              vm={vm}
              onMarkHandled={onMarkHandled}
              onReturnCall={onReturnCall}
            />
          ))}
        </div>
      )}
    </div>
  )
}
