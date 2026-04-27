'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  ArrowRight,
  Mail,
} from '@/components/ui/icons'
import type { TriageData, TriageEvent } from '@/lib/network/emergency-triage-actions'
import { sendChefTransitionEmail } from '@/lib/email/send-chef-transition'

type TimeRange = '7d' | '30d' | '90d' | 'all'
type SortBy = 'date' | 'revenue' | 'guests'
type FilterStatus = 'untriaged' | 'handed_off' | 'all'

function formatCents(cents: number | null): string {
  if (!cents) return '$0'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function daysFromNow(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  draft: { label: 'Draft', variant: 'default' },
  proposed: { label: 'Proposed', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'success' },
  paid: { label: 'Paid', variant: 'success' },
  confirmed: { label: 'Confirmed', variant: 'success' },
  in_progress: { label: 'In Progress', variant: 'warning' },
}

export function EmergencyTriageClient({ data }: { data: TriageData }) {
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [emergencyMode, setEmergencyMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('chefflow:emergency-mode') === 'true'
  })

  function toggleEmergencyMode() {
    const next = !emergencyMode
    setEmergencyMode(next)
    localStorage.setItem('chefflow:emergency-mode', String(next))
  }

  const filtered = useMemo(() => {
    let events = [...data.events]

    // Time filter
    if (timeRange !== 'all') {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      events = events.filter((e) => daysFromNow(e.eventDate) <= days)
    }

    // Triage status filter
    if (filterStatus === 'untriaged') {
      events = events.filter((e) => !e.hasActiveHandoff)
    } else if (filterStatus === 'handed_off') {
      events = events.filter((e) => e.hasActiveHandoff)
    }

    // Sort
    if (sortBy === 'revenue') {
      events.sort((a, b) => (b.quotedPriceCents || 0) - (a.quotedPriceCents || 0))
    } else if (sortBy === 'guests') {
      events.sort((a, b) => b.guestCount - a.guestCount)
    }
    // date is default (already sorted by server)

    return events
  }, [data.events, timeRange, sortBy, filterStatus])

  const untriagedCount = data.events.filter((e) => !e.hasActiveHandoff).length

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-stone-100">Emergency Triage</h1>
          </div>
          <p className="text-sm text-stone-400 mt-1">
            Manage all upcoming events when you cannot be there
          </p>
        </div>
        <Link href="/network?tab=collab">
          <Button variant="ghost" size="sm">
            Back to Network
          </Button>
        </Link>
      </div>

      {/* Emergency Mode Toggle */}
      <div
        className={`border rounded-xl p-4 flex items-center justify-between ${
          emergencyMode ? 'bg-red-950/30 border-red-800/50' : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        <div>
          <div className="text-sm font-medium text-stone-200">
            Emergency Mode {emergencyMode ? 'ON' : 'OFF'}
          </div>
          <div className="text-xs text-stone-400 mt-0.5">
            {emergencyMode
              ? 'You are in emergency triage mode. Work through each event below.'
              : 'Activate when you cannot fulfill upcoming events.'}
          </div>
        </div>
        <button
          type="button"
          title={emergencyMode ? 'Deactivate emergency mode' : 'Activate emergency mode'}
          onClick={toggleEmergencyMode}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            emergencyMode ? 'bg-red-600' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              emergencyMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-stone-100">{data.events.length}</div>
          <div className="text-xs text-stone-400 mt-1">Upcoming Events</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">
            {formatCents(data.totalRevenueCents)}
          </div>
          <div className="text-xs text-stone-400 mt-1">Revenue at Risk</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-stone-100">{data.totalGuests}</div>
          <div className="text-xs text-stone-400 mt-1">Guests Affected</div>
        </div>
      </div>

      {/* Untriaged alert */}
      {untriagedCount > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-200">
            {untriagedCount} event{untriagedCount !== 1 ? 's' : ''} need triage. Create a handoff or
            cancel for each one.
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-500">Time:</span>
          {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                timeRange === r
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-500">Sort:</span>
          {(
            [
              ['date', 'Date'],
              ['revenue', 'Revenue'],
              ['guests', 'Guests'],
            ] as [SortBy, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSortBy(val)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                sortBy === val
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-500">Show:</span>
          {(
            [
              ['all', 'All'],
              ['untriaged', 'Untriaged'],
              ['handed_off', 'Handed Off'],
            ] as [FilterStatus, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterStatus(val)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                filterStatus === val
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Event Cards */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-3" />
          <p className="text-stone-300 font-medium">No upcoming events to triage</p>
          <p className="text-sm text-stone-500 mt-1">You are all clear.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => (
            <TriageEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function TriageEventCard({ event }: { event: TriageEvent }) {
  const days = daysFromNow(event.eventDate)
  const urgent = days <= 7
  const statusInfo = STATUS_BADGE[event.status] || {
    label: event.status,
    variant: 'default' as const,
  }
  const [showNotify, setShowNotify] = useState(false)
  const [newChefName, setNewChefName] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [emailSent, setEmailSent] = useState(false)

  const readinessItems = [
    { label: 'Grocery', ready: event.groceryListReady },
    { label: 'Prep', ready: event.prepListReady },
    { label: 'Timeline', ready: event.timelineReady },
    { label: 'Equipment', ready: event.equipmentListReady },
  ]

  function handleSendEmail() {
    if (!newChefName.trim()) {
      toast.error('Enter the replacement chef name')
      return
    }
    startTransition(async () => {
      try {
        const result = await sendChefTransitionEmail({
          eventId: event.id,
          newChefName: newChefName.trim(),
          personalNote: personalNote.trim() || null,
        })
        if (result.success) {
          toast.success(`Transition email sent for ${event.clientName}`)
          setEmailSent(true)
          setShowNotify(false)
        } else {
          toast.error(result.error || 'Failed to send email')
        }
      } catch {
        toast.error('Failed to send transition email')
      }
    })
  }

  return (
    <div
      className={`bg-zinc-900 border rounded-xl p-5 ${
        urgent ? 'border-amber-700/60' : 'border-zinc-800'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          {/* Top row: date + status + handoff badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-stone-200">
              {formatDate(event.eventDate)}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                urgent ? 'bg-amber-900/50 text-amber-300' : 'bg-zinc-800 text-stone-400'
              }`}
            >
              {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}
            </span>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            {event.hasActiveHandoff && <Badge variant="info">Handoff Sent</Badge>}
            {emailSent && <Badge variant="success">Client Notified</Badge>}
          </div>

          {/* Client + occasion */}
          <div>
            <div className="text-base font-semibold text-stone-100">{event.clientName}</div>
            {event.occasion && <div className="text-sm text-stone-400">{event.occasion}</div>}
          </div>

          {/* Details row */}
          <div className="flex items-center gap-4 text-xs text-stone-400">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {event.guestCount} guests
            </span>
            {(event.locationCity || event.locationState) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {[event.locationCity, event.locationState].filter(Boolean).join(', ')}
              </span>
            )}
            {event.quotedPriceCents && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {formatCents(event.quotedPriceCents)}
              </span>
            )}
          </div>

          {/* Menu + readiness */}
          <div className="flex items-center gap-3 flex-wrap">
            {event.menuId ? (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {event.menuName || 'Menu assigned'}
              </span>
            ) : (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                No menu
              </span>
            )}
            {readinessItems
              .filter((r) => r.ready)
              .map((r) => (
                <span key={r.label} className="text-xs text-green-400/70 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {r.label}
                </span>
              ))}
          </div>

          {/* Notify Client inline form */}
          {showNotify && (
            <div className="bg-zinc-800/70 rounded-lg p-3 space-y-2 mt-1">
              <div className="text-xs text-stone-400">
                Send a professional transition email to {event.clientName}
              </div>
              <input
                type="text"
                placeholder="Replacement chef name"
                value={newChefName}
                onChange={(e) => setNewChefName(e.target.value)}
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
                disabled={isPending}
              />
              <textarea
                placeholder="Personal note to client (optional)"
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                rows={2}
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
                disabled={isPending}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSendEmail} disabled={isPending}>
                  {isPending ? 'Sending...' : 'Send Email'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowNotify(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {!event.hasActiveHandoff && (
            <Link href={`/network?tab=collab&action=create-handoff&eventId=${event.id}`}>
              <Button variant="primary" size="sm" className="w-full">
                <ArrowRight className="h-3.5 w-3.5 mr-1" />
                Hand Off
              </Button>
            </Link>
          )}
          {!emailSent && !showNotify && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setShowNotify(true)}
            >
              <Mail className="h-3.5 w-3.5 mr-1" />
              Notify Client
            </Button>
          )}
          <Link href={`/events/${event.id}`}>
            <Button variant="ghost" size="sm" className="w-full">
              View Event
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
