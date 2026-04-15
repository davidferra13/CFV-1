'use client'

/**
 * Call Log - Unified chronological feed of every call ever made or received.
 *
 * Merges supplier_calls (availability checks) and ai_calls (all other roles)
 * into one list sorted newest first. Each row expands to show full transcript
 * and any structured data captured during the call.
 */

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Phone,
  Check,
  X,
  Clock,
  AlertCircle,
  Mic,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
} from '@/components/ui/icons'

// ---- Types ----------------------------------------------------------------

interface SupplierCall {
  id: string
  vendor_name: string
  vendor_phone: string
  ingredient_name: string
  status: string
  result?: 'yes' | 'no' | null
  price_quoted?: string | null
  quantity_available?: string | null
  speech_transcript?: string | null
  recording_url?: string | null
  duration_seconds?: number | null
  created_at: string
}

interface AiCall {
  id: string
  direction: string
  role: string
  contact_name?: string | null
  contact_phone?: string | null
  subject?: string | null
  status: string
  result?: 'yes' | 'no' | null
  full_transcript?: string | null
  extracted_data?: Record<string, any> | null
  recording_url?: string | null
  duration_seconds?: number | null
  created_at: string
}

interface Props {
  calls: SupplierCall[]
  aiCalls: AiCall[]
}

// ---- Unified row type ------------------------------------------------------

type UnifiedCall = { kind: 'supplier'; data: SupplierCall } | { kind: 'ai'; data: AiCall }

// ---- Labels / colors -------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  vendor_availability: 'Availability',
  vendor_delivery: 'Delivery',
  venue_confirmation: 'Venue',
  equipment_rental: 'Equipment',
  inbound_vendor_callback: 'Vendor Callback',
  inbound_voicemail: 'Voicemail',
  inbound_unknown: 'Inbound',
}

const ROLE_COLORS: Record<string, string> = {
  vendor_availability: 'bg-violet-950 text-violet-300',
  vendor_delivery: 'bg-blue-950 text-blue-300',
  venue_confirmation: 'bg-teal-950 text-teal-300',
  inbound_vendor_callback: 'bg-amber-950 text-amber-300',
  inbound_voicemail: 'bg-purple-950 text-purple-300',
  inbound_unknown: 'bg-stone-800 text-stone-400',
}

function statusDot(status: string, result?: 'yes' | 'no' | null) {
  if (status === 'completed' && result === 'yes') return 'bg-emerald-400'
  if (status === 'completed' && result === 'no') return 'bg-rose-400'
  if (status === 'completed') return 'bg-stone-400'
  if (status === 'voicemail') return 'bg-violet-400'
  if (status === 'no_answer' || status === 'busy') return 'bg-amber-400'
  if (status === 'failed') return 'bg-rose-500'
  if (status === 'in_progress' || status === 'ringing') return 'bg-blue-400 animate-pulse'
  return 'bg-stone-600'
}

function statusText(status: string, result?: 'yes' | 'no' | null) {
  if (status === 'completed' && result === 'yes') return 'In stock'
  if (status === 'completed' && result === 'no') return 'Not available'
  if (status === 'completed') return 'Completed'
  if (status === 'voicemail') return 'Voicemail'
  if (status === 'no_answer') return 'No answer'
  if (status === 'busy') return 'Line busy'
  if (status === 'failed') return 'Failed'
  if (status === 'in_progress') return 'In progress'
  if (status === 'ringing') return 'Ringing'
  return 'Queued'
}

function fmtDuration(secs?: number | null) {
  if (!secs) return null
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

// ---- Extracted data renderer -----------------------------------------------

function ExtractedData({ data }: { data: Record<string, any> }) {
  const entries = Object.entries(data).filter(([, v]) => v != null && v !== '')
  if (entries.length === 0) return null

  const labels: Record<string, string> = {
    delivery_window: 'Delivery window',
    contact_notes: 'Contact / handling',
    access_window: 'Kitchen access',
    kitchen_notes: 'Kitchen notes',
    message: 'Message',
  }

  return (
    <div className="mt-3 space-y-1.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2 text-xs">
          <span className="text-stone-500 shrink-0 w-32">{labels[key] || key}:</span>
          <span className="text-stone-300">{String(value)}</span>
        </div>
      ))}
    </div>
  )
}

// ---- Row -------------------------------------------------------------------

function CallRow({ item }: { item: UnifiedCall }) {
  const [expanded, setExpanded] = useState(false)

  if (item.kind === 'supplier') {
    const c = item.data
    const hasDetail =
      c.speech_transcript || c.price_quoted || c.quantity_available || c.recording_url
    return (
      <div className="border-b border-stone-800 last:border-0">
        <button
          type="button"
          onClick={() => hasDetail && setExpanded((p) => !p)}
          className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${hasDetail ? 'hover:bg-stone-800/50 cursor-pointer' : 'cursor-default'}`}
        >
          {/* Direction dot */}
          <span className="shrink-0 flex items-center gap-1 w-6">
            <ArrowUpRight className="w-3.5 h-3.5 text-stone-500" />
          </span>

          {/* Role badge */}
          <span className="shrink-0 text-xs px-2 py-0.5 rounded font-medium bg-violet-950 text-violet-300 w-24 text-center">
            Availability
          </span>

          {/* Contact */}
          <span className="flex-1 min-w-0">
            <span className="text-sm text-stone-200 font-medium">{c.vendor_name}</span>
            <span className="text-xs text-stone-500 ml-2">{c.vendor_phone}</span>
          </span>

          {/* Subject */}
          <span className="text-xs text-stone-400 w-36 truncate hidden sm:block">
            {c.ingredient_name}
          </span>

          {/* Status */}
          <span className="flex items-center gap-1.5 w-28 shrink-0">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(c.status, c.result)}`}
            />
            <span className="text-xs text-stone-400">{statusText(c.status, c.result)}</span>
          </span>

          {/* Price */}
          <span className="text-xs font-mono text-emerald-300 w-20 shrink-0 hidden md:block">
            {c.price_quoted || ''}
          </span>

          {/* When */}
          <span className="text-xs text-stone-600 w-24 shrink-0 text-right hidden lg:block">
            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
          </span>

          {/* Expand */}
          {hasDetail && (
            <span className="shrink-0 text-stone-600">
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </button>

        {expanded && (
          <div className="px-5 pb-4 pt-1 bg-stone-900/50 text-xs space-y-3 border-t border-stone-800/50">
            <div className="flex gap-6 flex-wrap text-stone-500">
              <span>{format(new Date(c.created_at), 'MMM d, yyyy h:mm a')}</span>
              {c.duration_seconds && <span>{fmtDuration(c.duration_seconds)} duration</span>}
              {c.vendor_phone && <span>{c.vendor_phone}</span>}
            </div>

            {c.price_quoted && (
              <div className="flex gap-2">
                <span className="text-stone-500 w-32 shrink-0">Price quoted:</span>
                <span className="text-emerald-300 font-mono">{c.price_quoted}</span>
              </div>
            )}
            {c.quantity_available && (
              <div className="flex gap-2">
                <span className="text-stone-500 w-32 shrink-0">Quantity:</span>
                <span className="text-stone-300">{c.quantity_available}</span>
              </div>
            )}

            {c.speech_transcript && (
              <div className="bg-stone-800 rounded-lg p-3">
                <p className="text-stone-500 mb-1 text-xs font-medium uppercase tracking-wide">
                  Transcript
                </p>
                <p className="text-stone-300 leading-relaxed">
                  &ldquo;{c.speech_transcript}&rdquo;
                </p>
              </div>
            )}

            {c.recording_url && (
              <a
                href={c.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-violet-400 hover:text-violet-300"
              >
                <Mic className="w-3.5 h-3.5" />
                Listen to recording
              </a>
            )}
          </div>
        )}
      </div>
    )
  }

  // ai_calls row
  const c = item.data
  const hasDetail = c.full_transcript || c.extracted_data || c.recording_url
  const isInbound = c.direction === 'inbound'

  return (
    <div className="border-b border-stone-800 last:border-0">
      <button
        type="button"
        onClick={() => hasDetail && setExpanded((p) => !p)}
        className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${hasDetail ? 'hover:bg-stone-800/50 cursor-pointer' : 'cursor-default'}`}
      >
        {/* Direction */}
        <span className="shrink-0 w-6">
          {isInbound ? (
            <ArrowDownRight className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5 text-stone-500" />
          )}
        </span>

        {/* Role badge */}
        <span
          className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium w-24 text-center ${ROLE_COLORS[c.role] || 'bg-stone-800 text-stone-400'}`}
        >
          {ROLE_LABELS[c.role] || c.role}
        </span>

        {/* Contact */}
        <span className="flex-1 min-w-0">
          <span className="text-sm text-stone-200 font-medium">
            {c.contact_name || c.contact_phone || 'Unknown'}
          </span>
          {c.contact_name && <span className="text-xs text-stone-500 ml-2">{c.contact_phone}</span>}
        </span>

        {/* Subject */}
        <span className="text-xs text-stone-400 w-36 truncate hidden sm:block">
          {c.subject || ''}
        </span>

        {/* Status */}
        <span className="flex items-center gap-1.5 w-28 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(c.status, c.result)}`} />
          <span className="text-xs text-stone-400">{statusText(c.status, c.result)}</span>
        </span>

        {/* Spacer (price col) */}
        <span className="w-20 shrink-0 hidden md:block" />

        {/* When */}
        <span className="text-xs text-stone-600 w-24 shrink-0 text-right hidden lg:block">
          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
        </span>

        {hasDetail && (
          <span className="shrink-0 text-stone-600">
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-4 pt-1 bg-stone-900/50 text-xs space-y-3 border-t border-stone-800/50">
          <div className="flex gap-6 flex-wrap text-stone-500">
            <span>{format(new Date(c.created_at), 'MMM d, yyyy h:mm a')}</span>
            {c.duration_seconds && <span>{fmtDuration(c.duration_seconds)} duration</span>}
            {c.contact_phone && <span>{c.contact_phone}</span>}
          </div>

          {c.extracted_data && <ExtractedData data={c.extracted_data} />}

          {c.full_transcript && (
            <div className="bg-stone-800 rounded-lg p-3">
              <p className="text-stone-500 mb-1 text-xs font-medium uppercase tracking-wide">
                Transcript
              </p>
              <p className="text-stone-300 leading-relaxed">&ldquo;{c.full_transcript}&rdquo;</p>
            </div>
          )}

          {c.recording_url && (
            <a
              href={c.recording_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-violet-400 hover:text-violet-300"
            >
              <Mic className="w-3.5 h-3.5" />
              Listen to recording
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ---- Main component --------------------------------------------------------

export function CallLog({ calls, aiCalls }: Props) {
  // Merge into one chronological list, newest first
  const unified: UnifiedCall[] = [
    ...calls.map((c) => ({ kind: 'supplier' as const, data: c, ts: c.created_at })),
    ...aiCalls.map((c) => ({ kind: 'ai' as const, data: c, ts: c.created_at })),
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

  if (unified.length === 0) {
    return (
      <div className="bg-stone-900 rounded-xl border border-stone-700 px-6 py-16 text-center">
        <Phone className="w-8 h-8 text-stone-600 mx-auto mb-3" />
        <p className="text-stone-400 text-sm">No calls yet.</p>
        <p className="text-stone-600 text-xs mt-1">Every call made or received appears here.</p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-semibold text-stone-200">All Calls</span>
          <span className="text-xs text-stone-500">{unified.length} total</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-stone-500 hidden sm:flex">
          <span className="flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Outbound
          </span>
          <span className="flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-amber-500" /> Inbound
          </span>
          <span className="text-stone-600">Click any row for transcript</span>
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid px-5 py-2 border-b border-stone-800 text-xs font-semibold text-stone-600 uppercase tracking-wide"
        style={{ gridTemplateColumns: '24px 96px 1fr 144px 112px 80px 96px 16px' }}
      >
        <span />
        <span>Type</span>
        <span>Contact</span>
        <span className="hidden sm:block">Subject</span>
        <span>Result</span>
        <span className="hidden md:block">Price</span>
        <span className="hidden lg:block text-right">When</span>
        <span />
      </div>

      {/* Rows */}
      <div className="divide-y divide-stone-800">
        {unified.map((item) => (
          <CallRow
            key={item.kind === 'supplier' ? `s-${item.data.id}` : `a-${item.data.id}`}
            item={item}
          />
        ))}
      </div>
    </div>
  )
}
