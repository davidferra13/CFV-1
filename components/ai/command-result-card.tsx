'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { approveTask } from '@/lib/ai/command-orchestrator'
import type { TaskResult } from '@/lib/ai/command-types'

interface CommandResultCardProps {
  result: TaskResult
  onStatusChange: (taskId: string, status: 'approved' | 'rejected') => void
}

// ─── Tier-based styling ────────────────────────────────────────────────────────

function tierBorder(tier: 1 | 2 | 3) {
  if (tier === 1) return 'border-emerald-700 bg-emerald-950/40'
  if (tier === 2) return 'border-amber-600 bg-amber-950/40'
  return 'border-red-700 bg-red-950/40'
}

function tierIcon(result: TaskResult) {
  if (result.status === 'done' || result.status === 'approved') {
    return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
  }
  if (result.status === 'held' || result.status === 'error') {
    return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
  }
  // pending (tier 2 draft)
  return <Clock className="w-4 h-4 text-amber-400 shrink-0" />
}

function tierLabel(result: TaskResult) {
  if (result.status === 'done') return 'Done'
  if (result.status === 'approved') return 'Approved'
  if (result.status === 'rejected') return 'Dismissed'
  if (result.status === 'held') return 'Needs clarification'
  if (result.status === 'error') return 'Error'
  return 'Awaiting your approval'
}

// ─── Data Renderers ───────────────────────────────────────────────────────────

function ClientSearchData({ data }: { data: unknown }) {
  const d = data as { clients: Array<{ id: string; name: string; status: string }> }
  if (!d.clients.length) {
    return <p className="text-sm text-gray-400">No clients found.</p>
  }
  return (
    <ul className="mt-1 space-y-0.5">
      {d.clients.map((c) => (
        <li key={c.id} className="text-sm text-gray-200">
          {c.name} <span className="text-xs text-gray-500 capitalize">{c.status}</span>
        </li>
      ))}
    </ul>
  )
}

function CalendarData({ data }: { data: unknown }) {
  const d = data as {
    date: string
    available: boolean
    conflicts: Array<{ occasion: string; time: string }>
  }
  return (
    <div className="mt-1 text-sm">
      {d.available ? (
        <p className="text-emerald-400 font-medium">{d.date} is available — no events booked.</p>
      ) : (
        <>
          <p className="text-amber-400 font-medium">
            {d.date} has {d.conflicts.length} event{d.conflicts.length !== 1 ? 's' : ''} booked:
          </p>
          <ul className="mt-1 space-y-0.5 text-gray-300">
            {d.conflicts.map((c, i) => (
              <li key={i}>
                {c.occasion} at {c.time}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function EventListData({ data }: { data: unknown }) {
  const d = data as {
    events: Array<{
      id: string
      occasion: string | null
      date: string | null
      status: string
      clientName: string
    }>
  }
  if (!d.events.length) {
    return <p className="text-sm text-gray-400">No upcoming events found.</p>
  }
  return (
    <ul className="mt-1 space-y-1">
      {d.events.map((e) => (
        <li key={e.id} className="text-sm text-gray-200">
          <span className="font-medium">{e.occasion ?? 'Event'}</span> — {e.clientName} &middot;{' '}
          {e.date?.split('T')[0] ?? 'TBD'}{' '}
          <span className="text-xs text-gray-500 capitalize">[{e.status}]</span>
        </li>
      ))}
    </ul>
  )
}

function FinanceSummaryData({ data }: { data: unknown }) {
  const d = data as { totalRevenueCents: number; eventCount: number; completedCount: number }
  const revenue = (d.totalRevenueCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  })
  return (
    <div className="mt-1 space-y-0.5 text-sm text-gray-200">
      <p>
        <span className="font-medium text-white">{revenue}</span> in payments received
      </p>
      <p>
        {d.eventCount} total event{d.eventCount !== 1 ? 's' : ''} &middot; {d.completedCount}{' '}
        completed
      </p>
    </div>
  )
}

function EmailDraftData({ data, onCopied }: { data: unknown; onCopied: () => void }) {
  const d = data as { clientId: string; clientName: string; draftText: string }
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(d.draftText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopied()
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-gray-500 uppercase tracking-wide">To: {d.clientName}</p>
      <div className="rounded bg-black/40 border border-gray-700 p-3 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
        {d.draftText}
      </div>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3 text-emerald-400" /> Copied
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" /> Copy draft
          </>
        )}
      </button>
    </div>
  )
}

function EventDraftData({ data }: { data: unknown }) {
  const d = data as { draft: Record<string, unknown> | null; error?: string }
  if (d.error || !d.draft) {
    return <p className="text-sm text-red-400">{d.error ?? 'Could not parse event.'}</p>
  }
  const raw = d.draft
  const clientName = raw.client_name ? String(raw.client_name) : null
  const occasion = raw.occasion ? String(raw.occasion) : null
  const eventDate = raw.event_date ? String(raw.event_date) : null
  const guestCount = raw.guest_count ? String(raw.guest_count) : null
  const location = raw.location_description ? String(raw.location_description) : null
  const priceCents = typeof raw.quoted_price_cents === 'number' ? raw.quoted_price_cents : null
  const dietary = raw.dietary_notes ? String(raw.dietary_notes) : null
  return (
    <div className="mt-2 space-y-1 text-sm text-gray-200">
      {clientName && (
        <p>
          <span className="text-gray-500">Client:</span> {clientName}
        </p>
      )}
      {occasion && (
        <p>
          <span className="text-gray-500">Occasion:</span> {occasion}
        </p>
      )}
      {eventDate && (
        <p>
          <span className="text-gray-500">Date:</span> {eventDate}
        </p>
      )}
      {guestCount && (
        <p>
          <span className="text-gray-500">Guests:</span> {guestCount}
        </p>
      )}
      {location && (
        <p>
          <span className="text-gray-500">Location:</span> {location}
        </p>
      )}
      {priceCents !== null && (
        <p>
          <span className="text-gray-500">Quote:</span>{' '}
          {(priceCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </p>
      )}
      {dietary && (
        <p>
          <span className="text-gray-500">Dietary:</span> {dietary}
        </p>
      )}
    </div>
  )
}

// ─── Main Card ────────────────────────────────────────────────────────────────

export function CommandResultCard({ result, onStatusChange }: CommandResultCardProps) {
  const [localStatus, setLocalStatus] = useState(result.status)
  const [approving, setApproving] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const handleApprove = async () => {
    setApproving(true)
    try {
      await approveTask(result.taskType, result.data)
      setLocalStatus('approved')
      onStatusChange(result.taskId, 'approved')
    } catch {
      // non-blocking — approval failing doesn't break anything
    } finally {
      setApproving(false)
    }
  }

  const handleReject = () => {
    setLocalStatus('rejected')
    onStatusChange(result.taskId, 'rejected')
  }

  const isDraft = result.tier === 2 && localStatus === 'pending'
  const isHeld = result.tier === 3

  return (
    <div className={`rounded-lg border p-4 transition-all ${tierBorder(result.tier)}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {tierIcon({ ...result, status: localStatus })}
          <span className="font-medium text-sm text-white truncate">{result.name}</span>
          <span className="text-xs text-gray-500 shrink-0">
            {tierLabel({ ...result, status: localStatus })}
          </span>
        </div>
        <button
          onClick={() => setExpanded((p) => !p)}
          className="text-gray-500 hover:text-gray-300 transition-colors shrink-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Body */}
      {expanded && (
        <div className="mt-2">
          {/* Error state */}
          {localStatus === 'error' && result.error && (
            <p className="text-sm text-red-400">{result.error}</p>
          )}

          {/* Tier 3 hold */}
          {isHeld && result.holdReason && (
            <p className="text-sm text-amber-300">{result.holdReason}</p>
          )}

          {/* Tier 1/2 data */}
          {result.data !== undefined && localStatus !== 'rejected' && (
            <>
              {result.taskType === 'client.search' && <ClientSearchData data={result.data} />}
              {result.taskType === 'calendar.availability' && <CalendarData data={result.data} />}
              {result.taskType === 'event.list_upcoming' && <EventListData data={result.data} />}
              {result.taskType === 'finance.summary' && <FinanceSummaryData data={result.data} />}
              {result.taskType === 'email.followup' && (
                <EmailDraftData data={result.data} onCopied={() => {}} />
              )}
              {result.taskType === 'event.create_draft' && <EventDraftData data={result.data} />}
            </>
          )}

          {/* Tier 2 approval actions */}
          {isDraft && (
            <div className="mt-3 flex items-center gap-2">
              <Button variant="primary" onClick={handleApprove} disabled={approving}>
                {approving ? 'Approving…' : 'Approve'}
              </Button>
              <Button variant="ghost" onClick={handleReject}>
                <X className="w-3.5 h-3.5 mr-1" /> Dismiss
              </Button>
            </div>
          )}

          {/* Approved state */}
          {localStatus === 'approved' && (
            <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> You approved this draft.
            </p>
          )}

          {/* Rejected state */}
          {localStatus === 'rejected' && (
            <p className="mt-2 text-xs text-gray-500 italic">Dismissed.</p>
          )}
        </div>
      )}
    </div>
  )
}
