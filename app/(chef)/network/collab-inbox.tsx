'use client'

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { showUndoToast } from '@/components/ui/undo-toast'
import {
  cancelCollabHandoff,
  createCollabHandoff,
  deleteCollabAvailabilitySignal,
  getCollabAvailabilitySignals,
  getCollabHandoffTimeline,
  getCollabInbox,
  getCollabMetrics,
  getCollabRecipientSuggestions,
  markCollabHandoffViewed,
  recordCollabHandoffConversion,
  respondToCollabHandoff,
  upsertCollabAvailabilitySignal,
  type CollabAvailabilitySignal,
  type CollabHandoffTimelineEvent,
  type CollabInbox,
  type CollabMetrics,
  type CollabRecipientSuggestion,
  type HandoffRecipientStatus,
  type TrustedCircleMember,
} from '@/lib/network/collab-actions'
import { createIntroductionBridge, getBridgeForHandoff } from '@/lib/network/intro-bridge-actions'

interface CollabInboxProps {
  trustedCircle: TrustedCircleMember[]
  initialInbox: CollabInbox
  initialSignals: CollabAvailabilitySignal[]
  initialMetrics: CollabMetrics
  initialFocusHandoffId?: string | null
}

function formatBudget(cents: number | null): string {
  if (cents == null) return 'Not specified'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function formatPercent(value: number | null): string {
  if (value == null) return 'N/A'
  return `${value.toFixed(1)}%`
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Not set'
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return 'Not set'
  return new Date(parsed).toLocaleString()
}

function statusBadgeClass(status: string): string {
  if (status === 'accepted' || status === 'converted' || status === 'closed') {
    return 'bg-emerald-950 text-emerald-300 border-emerald-700'
  }
  if (
    status === 'rejected' ||
    status === 'withdrawn' ||
    status === 'cancelled' ||
    status === 'expired'
  ) {
    return 'bg-red-950 text-red-300 border-red-700'
  }
  if (status === 'partially_accepted' || status === 'viewed') {
    return 'bg-amber-950 text-amber-300 border-amber-700'
  }
  return 'bg-brand-950 text-brand-300 border-brand-700'
}

function renderRecipientStatus(status: HandoffRecipientStatus): string {
  if (status === 'sent') return 'Sent'
  if (status === 'viewed') return 'Viewed'
  if (status === 'accepted') return 'Accepted'
  if (status === 'rejected') return 'Rejected'
  if (status === 'withdrawn') return 'Withdrawn'
  return 'Converted'
}

function formatTimelineEvent(eventType: CollabHandoffTimelineEvent['event_type']): string {
  if (eventType === 'created') return 'Created'
  if (eventType === 'viewed') return 'Viewed'
  if (eventType === 'accepted') return 'Accepted'
  if (eventType === 'rejected') return 'Rejected'
  if (eventType === 'withdrawn') return 'Withdrawn'
  if (eventType === 'converted') return 'Converted'
  if (eventType === 'cancelled') return 'Cancelled'
  return 'Status Updated'
}

export function CollabInboxPanel({
  trustedCircle,
  initialInbox,
  initialSignals,
  initialMetrics,
  initialFocusHandoffId = null,
}: CollabInboxProps) {
  const [inbox, setInbox] = useState(initialInbox)
  const [signals, setSignals] = useState(initialSignals)
  const [deleteSignalConfirmId, setDeleteSignalConfirmId] = useState<string | null>(null)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date().toISOString())
  const [timelineByHandoff, setTimelineByHandoff] = useState<
    Record<string, CollabHandoffTimelineEvent[]>
  >({})
  const [timelineOpen, setTimelineOpen] = useState<Record<string, boolean>>({})
  const [timelineLoadingId, setTimelineLoadingId] = useState<string | null>(null)
  const [focusedHandoffId, setFocusedHandoffId] = useState<string | null>(
    initialFocusHandoffId?.trim() || null
  )

  const [title, setTitle] = useState('')
  const [handoffType, setHandoffType] = useState<'lead' | 'event_backup' | 'client_referral'>(
    'lead'
  )
  const [sourceEntityType, setSourceEntityType] = useState<'manual' | 'inquiry' | 'event'>('manual')
  const [sourceEntityId, setSourceEntityId] = useState('')
  const [visibilityScope, setVisibilityScope] = useState<
    'trusted_circle' | 'selected_chefs' | 'connections'
  >('trusted_circle')
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [occasion, setOccasion] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [locationText, setLocationText] = useState('')
  const [budgetDollars, setBudgetDollars] = useState('')
  const [handoffCuisines, setHandoffCuisines] = useState('')
  const [privateNote, setPrivateNote] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [recipientSuggestions, setRecipientSuggestions] = useState<CollabRecipientSuggestion[]>([])
  const [suggestionNote, setSuggestionNote] = useState<string | null>(null)

  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({})
  const [conversionEventIds, setConversionEventIds] = useState<Record<string, string>>({})
  const [conversionInquiryIds, setConversionInquiryIds] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [signalStart, setSignalStart] = useState('')
  const [signalEnd, setSignalEnd] = useState('')
  const [signalStatus, setSignalStatus] = useState<'available' | 'limited' | 'unavailable'>(
    'available'
  )
  const [signalRegion, setSignalRegion] = useState('')
  const [signalCuisines, setSignalCuisines] = useState('')
  const [signalMaxGuests, setSignalMaxGuests] = useState('')
  const [signalTrustedOnly, setSignalTrustedOnly] = useState(true)
  const [signalNote, setSignalNote] = useState('')

  // Introduction Bridge state
  const [introModalOpen, setIntroModalOpen] = useState<{
    handoffId: string
    recipientChefId: string
    recipientChefName: string
  } | null>(null)
  const [introClientName, setIntroClientName] = useState('')
  const [introClientEmail, setIntroClientEmail] = useState('')
  const [introMode, setIntroMode] = useState<'shared' | 'observer' | 'transfer'>('shared')
  const [introMessage, setIntroMessage] = useState('')
  const [introCopyGuests, setIntroCopyGuests] = useState(true)

  const [isPending, startTransition] = useTransition()
  const handoffRefs = useRef<Record<string, HTMLElement | null>>({})
  const autoFocusedRef = useRef<string | null>(null)

  const trustedRecipientOptions = useMemo(
    () => trustedCircle.map((member) => member.chef),
    [trustedCircle]
  )
  const recipientOptions = useMemo(() => {
    const map = new Map<string, (typeof trustedRecipientOptions)[number]>()
    for (const chef of trustedRecipientOptions) map.set(chef.chef_id, chef)
    for (const suggestion of recipientSuggestions) map.set(suggestion.chef.chef_id, suggestion.chef)
    return Array.from(map.values())
  }, [trustedRecipientOptions, recipientSuggestions])

  function setHandoffRef(handoffId: string, node: HTMLElement | null) {
    handoffRefs.current[handoffId] = node
  }

  const ensureTimelineLoaded = useCallback(
    async (handoffId: string) => {
      if (timelineByHandoff[handoffId]) return
      setTimelineLoadingId(handoffId)
      try {
        const timeline = await getCollabHandoffTimeline({ handoffId, limit: 40 })
        setTimelineByHandoff((prev) => ({ ...prev, [handoffId]: timeline }))
      } catch (err: any) {
        setError(err.message || 'Failed to load handoff timeline.')
      } finally {
        setTimelineLoadingId(null)
      }
    },
    [timelineByHandoff]
  )

  const refreshSnapshot = useCallback(async () => {
    const [freshInbox, freshSignals, freshMetrics] = await Promise.all([
      getCollabInbox(80),
      getCollabAvailabilitySignals(),
      getCollabMetrics(90),
    ])
    setInbox(freshInbox)
    setSignals(freshSignals)
    setMetrics(freshMetrics)
    setLastSyncedAt(new Date().toISOString())
  }, [])

  useEffect(() => {
    let cancelled = false
    async function refreshBackground() {
      try {
        await refreshSnapshot()
        if (cancelled) return
      } catch (error) {
        if (!cancelled) {
          console.error('[CollabInboxPanel] Background refresh failed:', error)
        }
      }
    }

    const interval = window.setInterval(() => {
      void refreshBackground()
    }, 60000)
    const onFocus = () => {
      void refreshBackground()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [refreshSnapshot])

  useEffect(() => {
    const handoffId = initialFocusHandoffId?.trim() || null
    if (!handoffId) return
    if (autoFocusedRef.current === handoffId) return

    const exists =
      inbox.incoming.some((row) => row.handoff_id === handoffId) ||
      inbox.outgoing.some((row) => row.handoff_id === handoffId)
    if (!exists) return

    autoFocusedRef.current = handoffId
    setFocusedHandoffId(handoffId)
    setTimelineOpen((prev) => ({ ...prev, [handoffId]: true }))
    if (!timelineByHandoff[handoffId]) {
      void ensureTimelineLoaded(handoffId)
    }

    const node = handoffRefs.current[handoffId]
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [
    initialFocusHandoffId,
    inbox.incoming,
    inbox.outgoing,
    timelineByHandoff,
    ensureTimelineLoaded,
  ])

  function resetHandoffForm() {
    setTitle('')
    setHandoffType('lead')
    setSourceEntityType('manual')
    setSourceEntityId('')
    setVisibilityScope('trusted_circle')
    setSelectedRecipients([])
    setOccasion('')
    setEventDate('')
    setGuestCount('')
    setLocationText('')
    setBudgetDollars('')
    setHandoffCuisines('')
    setPrivateNote('')
    setExpiresAt('')
    setRecipientSuggestions([])
    setSuggestionNote(null)
  }

  function toggleRecipient(chefId: string) {
    setSelectedRecipients((prev) =>
      prev.includes(chefId) ? prev.filter((id) => id !== chefId) : [...prev, chefId]
    )
  }

  function handleCreateHandoff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (sourceEntityType !== 'manual' && !sourceEntityId.trim()) {
      setError('Source ID is required for inquiry/event handoffs.')
      return
    }

    startTransition(async () => {
      try {
        const desiredCuisines = handoffCuisines
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
        const parsedExpiresAt = expiresAt.trim().length > 0 ? Date.parse(expiresAt.trim()) : NaN
        if (expiresAt.trim().length > 0 && !Number.isFinite(parsedExpiresAt)) {
          throw new Error('Expiration date/time is invalid.')
        }
        const expiresAtIso =
          expiresAt.trim().length > 0 ? new Date(parsedExpiresAt).toISOString() : null
        const budgetNumber =
          budgetDollars.trim().length > 0 ? Math.round(Number(budgetDollars) * 100) : null

        const result = await createCollabHandoff({
          title: title.trim(),
          handoffType,
          visibilityScope,
          recipientChefIds: visibilityScope === 'selected_chefs' ? selectedRecipients : undefined,
          sourceEntityType,
          sourceEntityId: sourceEntityType === 'manual' ? null : sourceEntityId.trim(),
          occasion: occasion.trim() || null,
          eventDate: eventDate || null,
          guestCount: guestCount ? Number(guestCount) : null,
          locationText: locationText.trim() || null,
          budgetCents: Number.isFinite(budgetNumber as number) ? budgetNumber : null,
          privateNote: privateNote.trim() || null,
          expiresAt: expiresAtIso,
          clientContext: {
            desired_cuisines: desiredCuisines,
          },
        })
        setFocusedHandoffId(result.handoffId)
        setTimelineOpen((prev) => ({ ...prev, [result.handoffId]: true }))
        await refreshSnapshot()
        resetHandoffForm()
      } catch (err: any) {
        setError(err.message || 'Failed to create handoff.')
      }
    })
  }

  function handleSuggestRecipients() {
    setError(null)
    setSuggestionNote(null)

    startTransition(async () => {
      try {
        const cuisines = handoffCuisines
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)

        const suggestions = await getCollabRecipientSuggestions({
          eventDate: eventDate || null,
          guestCount: guestCount ? Number(guestCount) : null,
          locationText: locationText.trim() || null,
          cuisines,
          maxResults: 8,
        })

        setRecipientSuggestions(suggestions)
        const suggestedIds = suggestions.map((item) => item.chef.chef_id)
        if (suggestedIds.length > 0) {
          setVisibilityScope('selected_chefs')
          setSelectedRecipients(suggestedIds)
          setSuggestionNote(`Loaded ${suggestedIds.length} suggested recipient(s).`)
        } else {
          setSuggestionNote('No suggestions found. Add more trusted chefs or availability signals.')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to generate recipient suggestions.')
      }
    })
  }

  function handleMarkViewed(handoffId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await markCollabHandoffViewed({ handoffId })
        await refreshSnapshot()
      } catch (err: any) {
        setError(err.message || 'Failed to mark handoff as viewed.')
      }
    })
  }

  function handleRespond(handoffId: string, action: 'accepted' | 'rejected') {
    const responseNote = (responseNotes[handoffId] || '').trim()
    setError(null)

    startTransition(async () => {
      try {
        await respondToCollabHandoff({
          handoffId,
          action,
          responseNote: responseNote || null,
        })
        await refreshSnapshot()
      } catch (err: any) {
        setError(err.message || 'Failed to respond to handoff.')
      }
    })
  }

  function handleMarkConverted(handoffId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await recordCollabHandoffConversion({
          handoffId,
          convertedEventId: conversionEventIds[handoffId] || null,
          convertedInquiryId: conversionInquiryIds[handoffId] || null,
        })
        await refreshSnapshot()
      } catch (err: any) {
        setError(err.message || 'Failed to mark conversion.')
      }
    })
  }

  function handleCancelOutgoing(handoffId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await cancelCollabHandoff({ handoffId })
        await refreshSnapshot()
      } catch (err: any) {
        setError(err.message || 'Failed to cancel handoff.')
      }
    })
  }

  function handleStartIntro() {
    if (!introModalOpen || !introClientName.trim()) return
    startTransition(async () => {
      try {
        const result = await createIntroductionBridge({
          handoffId: introModalOpen.handoffId,
          recipientChefId: introModalOpen.recipientChefId,
          clientName: introClientName.trim(),
          clientEmail: introClientEmail.trim() || null,
          introMode,
          introMessage: introMessage.trim() || null,
          copySourceGuests: introCopyGuests,
        })
        if (result.success && result.bridgeId) {
          toast.success('Introduction bridge created.')
          setIntroModalOpen(null)
          setIntroClientName('')
          setIntroClientEmail('')
          setIntroMode('shared')
          setIntroMessage('')
          setIntroCopyGuests(true)
          window.location.href = `/network/bridges/${result.bridgeId}`
        } else {
          toast.error(result.error || 'Failed to create bridge.')
        }
      } catch {
        toast.error('Failed to create introduction bridge.')
      }
    })
  }

  function handleCreateSignal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!signalStart || !signalEnd) {
      setError('Availability signal requires a start and end date.')
      return
    }

    startTransition(async () => {
      try {
        const cuisines = signalCuisines
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)

        await upsertCollabAvailabilitySignal({
          dateStart: signalStart,
          dateEnd: signalEnd,
          status: signalStatus,
          regionText: signalRegion.trim() || null,
          cuisines,
          maxGuestCount: signalMaxGuests ? Number(signalMaxGuests) : null,
          shareWithTrustedOnly: signalTrustedOnly,
          note: signalNote.trim() || null,
        })
        await refreshSnapshot()

        setSignalStart('')
        setSignalEnd('')
        setSignalStatus('available')
        setSignalRegion('')
        setSignalCuisines('')
        setSignalMaxGuests('')
        setSignalTrustedOnly(true)
        setSignalNote('')
      } catch (err: any) {
        setError(err.message || 'Failed to create availability signal.')
      }
    })
  }

  function handleDeleteSignal(signalId: string) {
    const target = signals.find((s) => s.id === signalId)
    if (!target) return

    setError(null)

    // Optimistic removal
    setSignals((prev) => prev.filter((s) => s.id !== signalId))

    // Deferred execution with undo
    const timer = setTimeout(async () => {
      try {
        await deleteCollabAvailabilitySignal(signalId)
        await refreshSnapshot()
      } catch (err: any) {
        setSignals((prev) => [...prev, target]) // rollback
        setError(err.message || 'Failed to delete availability signal.')
        toast.error('Failed to delete signal')
      }
    }, 8000)

    showUndoToast(
      'Signal deleted',
      () => {
        clearTimeout(timer)
        setSignals((prev) => [...prev, target])
      },
      8000
    )
  }

  function handleRefresh() {
    setError(null)
    startTransition(async () => {
      try {
        await refreshSnapshot()
      } catch (err: any) {
        setError(err.message || 'Failed to refresh collaboration data.')
      }
    })
  }

  function handleToggleTimeline(handoffId: string) {
    setError(null)
    setFocusedHandoffId(handoffId)

    if (timelineOpen[handoffId]) {
      setTimelineOpen((prev) => ({ ...prev, [handoffId]: false }))
      return
    }

    setTimelineOpen((prev) => ({ ...prev, [handoffId]: true }))
    if (!timelineByHandoff[handoffId]) {
      void ensureTimelineLoaded(handoffId)
    }
  }

  async function handleCopyHandoffLink(handoffId: string) {
    setError(null)
    setInfo(null)
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error('Clipboard is not available in this browser.')
      }
      const href = `${window.location.origin}/network?tab=collab&handoff=${encodeURIComponent(handoffId)}`
      await navigator.clipboard.writeText(href)
      setInfo('Handoff link copied.')
    } catch (err: any) {
      setError(err.message || 'Failed to copy handoff link.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <article className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2.5">
          <p className="text-xs-tight uppercase tracking-wide text-stone-500">Outgoing (90d)</p>
          <p className="text-lg font-semibold text-stone-100">{metrics.outgoing_total}</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {metrics.outgoing_open} open · {metrics.outgoing_closed} closed
          </p>
        </article>
        <article className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2.5">
          <p className="text-xs-tight uppercase tracking-wide text-stone-500">Response Quality</p>
          <p className="text-lg font-semibold text-stone-100">
            {formatPercent(metrics.acceptance_rate_pct)}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            Accept rate · Conv {formatPercent(metrics.conversion_rate_pct)}
          </p>
        </article>
        <article className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2.5">
          <p className="text-xs-tight uppercase tracking-wide text-stone-500">Response Speed</p>
          <p className="text-lg font-semibold text-stone-100">
            {metrics.avg_first_response_hours == null
              ? 'N/A'
              : `${metrics.avg_first_response_hours.toFixed(1)}h`}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">Average first recipient response</p>
        </article>
        <article className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2.5">
          <p className="text-xs-tight uppercase tracking-wide text-stone-500">Incoming</p>
          <p className="text-lg font-semibold text-stone-100">{metrics.incoming_total}</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {metrics.incoming_unread} unread · {metrics.incoming_actionable} actionable
          </p>
        </article>
      </section>

      <div className="rounded-lg border border-stone-700 bg-stone-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-stone-100">Create Collaboration Handoff</h3>
          <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={isPending}>
            Refresh
          </Button>
        </div>
        <p className="text-xs text-stone-400 mt-1">
          Post structured lead swaps, backup requests, and referrals to trusted chefs.
        </p>
        <p className="text-xs text-stone-500 mt-1">
          Last synced {new Date(lastSyncedAt).toLocaleTimeString()}
        </p>

        <form onSubmit={handleCreateHandoff} className="space-y-3 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Need backup chef for Friday dinner service"
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Type</label>
              <select
                value={handoffType}
                onChange={(event) =>
                  setHandoffType(event.target.value as 'lead' | 'event_backup' | 'client_referral')
                }
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              >
                <option value="lead">Lead</option>
                <option value="event_backup">Event Backup</option>
                <option value="client_referral">Client Referral</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Source</label>
              <select
                value={sourceEntityType}
                onChange={(event) =>
                  setSourceEntityType(event.target.value as 'manual' | 'inquiry' | 'event')
                }
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              >
                <option value="manual">Manual</option>
                <option value="inquiry">Inquiry</option>
                <option value="event">Event</option>
              </select>
            </div>
          </div>

          {sourceEntityType !== 'manual' && (
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">
                Source {sourceEntityType === 'inquiry' ? 'Inquiry' : 'Event'} ID
              </label>
              <input
                value={sourceEntityId}
                onChange={(event) => setSourceEntityId(event.target.value)}
                placeholder="UUID"
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Visibility</label>
              <select
                value={visibilityScope}
                onChange={(event) =>
                  setVisibilityScope(
                    event.target.value as 'trusted_circle' | 'selected_chefs' | 'connections'
                  )
                }
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              >
                <option value="trusted_circle">Trusted Circle</option>
                <option value="selected_chefs">Selected Chefs</option>
                <option value="connections">All Connections</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Occasion</label>
              <input
                value={occasion}
                onChange={(event) => setOccasion(event.target.value)}
                placeholder="Birthday dinner"
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Event Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Guests</label>
              <input
                type="number"
                min={1}
                max={2000}
                value={guestCount}
                onChange={(event) => setGuestCount(event.target.value)}
                placeholder="12"
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Location</label>
              <input
                value={locationText}
                onChange={(event) => setLocationText(event.target.value)}
                placeholder="Brooklyn, NY"
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">
                Desired Cuisines
              </label>
              <input
                value={handoffCuisines}
                onChange={(event) => setHandoffCuisines(event.target.value)}
                placeholder="Italian, Mediterranean, Vegan"
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-stone-500">
              Auto-match uses trust level + shared availability to prefill recipients.
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleSuggestRecipients}
              disabled={isPending}
            >
              Suggest Recipients
            </Button>
          </div>

          {suggestionNote && <p className="text-xs text-amber-500">{suggestionNote}</p>}

          {recipientSuggestions.length > 0 && (
            <div className="rounded-lg border border-stone-700 bg-stone-900/70 p-3 space-y-2">
              <p className="text-xs font-medium text-stone-300">Suggested recipients</p>
              <div className="space-y-2">
                {recipientSuggestions.map((suggestion) => (
                  <label
                    key={suggestion.chef.chef_id}
                    className="flex items-start gap-2 rounded-md border border-stone-700 px-2.5 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipients.includes(suggestion.chef.chef_id)}
                      onChange={() => toggleRecipient(suggestion.chef.chef_id)}
                      disabled={isPending}
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-stone-200 truncate">
                        {suggestion.chef.display_name || suggestion.chef.business_name}
                      </p>
                      <p className="text-xs text-stone-500">
                        Score {suggestion.score}
                        {suggestion.trust_level
                          ? ` - ${suggestion.trust_level.replace('_', ' ')}`
                          : ''}
                      </p>
                      {suggestion.reasons.length > 0 && (
                        <p className="text-xs text-stone-400 mt-0.5">
                          {suggestion.reasons.join(' | ')}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">
                Budget (USD)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={budgetDollars}
                onChange={(event) => setBudgetDollars(event.target.value)}
                placeholder="1800.00"
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Expires At</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              />
            </div>
          </div>

          {visibilityScope === 'selected_chefs' && (
            <div className="rounded-lg border border-stone-700 bg-stone-900/70 p-3">
              <p className="text-xs font-medium text-stone-300 mb-2">Select recipients</p>
              {recipientOptions.length === 0 ? (
                <p className="text-sm text-stone-500">Add chefs to Trusted Circle first.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {recipientOptions.map((chef) => (
                    <label
                      key={chef.chef_id}
                      className="flex items-center gap-2 text-sm text-stone-300"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(chef.chef_id)}
                        onChange={() => toggleRecipient(chef.chef_id)}
                        disabled={isPending}
                      />
                      <span>{chef.display_name || chef.business_name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1.5">
              Private Note to Recipients
            </label>
            <textarea
              value={privateNote}
              onChange={(event) => setPrivateNote(event.target.value)}
              rows={3}
              placeholder="Client style preferences, constraints, and key context."
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              disabled={isPending}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isPending}>
              Create Handoff
            </Button>
          </div>
        </form>
      </div>

      {error && (
        <div className="rounded-lg border border-red-700 bg-red-950 px-3 py-2">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      {info && (
        <div className="rounded-lg border border-emerald-700 bg-emerald-950 px-3 py-2">
          <p className="text-sm text-emerald-300">{info}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-lg border border-stone-700 bg-stone-900 p-4">
          <h3 className="text-sm font-semibold text-stone-100">Incoming Handoffs</h3>
          {inbox.incoming.length === 0 ? (
            <p className="text-sm text-stone-500 mt-3">No incoming collaboration requests.</p>
          ) : (
            <div className="space-y-3 mt-3">
              {inbox.incoming.map((handoff) => (
                <article
                  key={handoff.recipient_row_id}
                  ref={(node) => setHandoffRef(handoff.handoff_id, node)}
                  className={`rounded-lg border p-3 ${
                    focusedHandoffId === handoff.handoff_id
                      ? 'border-amber-500/70 bg-amber-950/20'
                      : 'border-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-100 truncate">
                        {handoff.title}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        From {handoff.from_chef.display_name || handoff.from_chef.business_name}
                      </p>
                    </div>
                    <span
                      className={`text-xs border rounded-full px-2 py-0.5 ${statusBadgeClass(
                        handoff.recipient_status
                      )}`}
                    >
                      {renderRecipientStatus(handoff.recipient_status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-400 mt-2">
                    <p>Type: {handoff.handoff_type.replace('_', ' ')}</p>
                    <p>Date: {handoff.event_date ?? 'TBD'}</p>
                    <p className="col-span-2">
                      Source:{' '}
                      {handoff.source_entity_type === 'manual'
                        ? 'Manual'
                        : `${handoff.source_entity_type ?? 'Unknown'}${handoff.source_entity_id ? ` (${handoff.source_entity_id})` : ''}`}
                    </p>
                    <p>Guests: {handoff.guest_count ?? 'TBD'}</p>
                    <p>Budget: {formatBudget(handoff.budget_cents)}</p>
                    <p className="col-span-2">Location: {handoff.location_text ?? 'TBD'}</p>
                    <p className="col-span-2">Expires: {formatDateTime(handoff.expires_at)}</p>
                  </div>
                  {Array.isArray((handoff.client_context as any)?.desired_cuisines) &&
                    (handoff.client_context as any).desired_cuisines.length > 0 && (
                      <p className="text-xs text-stone-400 mt-2">
                        Desired cuisines:{' '}
                        {(handoff.client_context as any).desired_cuisines.join(', ')}
                      </p>
                    )}

                  {handoff.private_note && (
                    <p className="text-sm text-stone-300 mt-2 whitespace-pre-wrap">
                      {handoff.private_note}
                    </p>
                  )}

                  {handoff.response_note && (
                    <p className="text-xs text-stone-500 mt-2">
                      Your note: {handoff.response_note}
                    </p>
                  )}

                  {handoff.recipient_status === 'sent' && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkViewed(handoff.handoff_id)}
                        disabled={isPending}
                      >
                        Mark Viewed
                      </Button>
                    </div>
                  )}

                  {(handoff.recipient_status === 'sent' ||
                    handoff.recipient_status === 'viewed') && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={responseNotes[handoff.handoff_id] || ''}
                        onChange={(event) =>
                          setResponseNotes((prev) => ({
                            ...prev,
                            [handoff.handoff_id]: event.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="Optional response note"
                        className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        disabled={isPending}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRespond(handoff.handoff_id, 'accepted')}
                          disabled={isPending}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRespond(handoff.handoff_id, 'rejected')}
                          disabled={isPending}
                        >
                          Pass
                        </Button>
                      </div>
                    </div>
                  )}

                  {handoff.recipient_status === 'accepted' && (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          value={conversionInquiryIds[handoff.handoff_id] || ''}
                          onChange={(event) =>
                            setConversionInquiryIds((prev) => ({
                              ...prev,
                              [handoff.handoff_id]: event.target.value,
                            }))
                          }
                          placeholder="Converted inquiry ID (optional)"
                          className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          disabled={isPending}
                        />
                        <input
                          value={conversionEventIds[handoff.handoff_id] || ''}
                          onChange={(event) =>
                            setConversionEventIds((prev) => ({
                              ...prev,
                              [handoff.handoff_id]: event.target.value,
                            }))
                          }
                          placeholder="Converted event ID (optional)"
                          className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          disabled={isPending}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleMarkConverted(handoff.handoff_id)}
                        disabled={isPending}
                      >
                        Mark Converted
                      </Button>
                    </div>
                  )}

                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleCopyHandoffLink(handoff.handoff_id)}
                      disabled={isPending}
                    >
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleToggleTimeline(handoff.handoff_id)}
                      disabled={isPending || timelineLoadingId === handoff.handoff_id}
                    >
                      {timelineLoadingId === handoff.handoff_id
                        ? 'Loading...'
                        : timelineOpen[handoff.handoff_id]
                          ? 'Hide Timeline'
                          : 'Timeline'}
                    </Button>
                  </div>

                  {timelineOpen[handoff.handoff_id] && (
                    <div className="mt-3 rounded-lg border border-stone-700 bg-stone-900/70 p-2.5">
                      {timelineByHandoff[handoff.handoff_id]?.length ? (
                        <div className="space-y-2">
                          {timelineByHandoff[handoff.handoff_id].map((event) => {
                            const actorName = event.actor
                              ? event.actor.display_name || event.actor.business_name
                              : 'System'
                            const metadataSummary = Object.entries(event.metadata ?? {})
                              .filter(([, value]) => value != null && String(value).trim() !== '')
                              .slice(0, 3)
                              .map(([key, value]) => `${key}: ${String(value)}`)
                              .join(' | ')

                            return (
                              <div
                                key={event.id}
                                className="rounded-md border border-stone-700 px-2.5 py-2"
                              >
                                <p className="text-xs text-stone-300">
                                  <span className="font-medium">{actorName}</span>{' '}
                                  {formatTimelineEvent(event.event_type).toLowerCase()}
                                </p>
                                <p className="text-xs-tight text-stone-500">
                                  {new Date(event.created_at).toLocaleString()}
                                </p>
                                {metadataSummary && (
                                  <p className="text-xs-tight text-stone-400 mt-1">
                                    {metadataSummary}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-500">No timeline events yet.</p>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-stone-700 bg-stone-900 p-4">
          <h3 className="text-sm font-semibold text-stone-100">Outgoing Handoffs</h3>
          {inbox.outgoing.length === 0 ? (
            <p className="text-sm text-stone-500 mt-3">No outgoing handoffs yet.</p>
          ) : (
            <div className="space-y-3 mt-3">
              {inbox.outgoing.map((handoff) => (
                <article
                  key={handoff.handoff_id}
                  ref={(node) => setHandoffRef(handoff.handoff_id, node)}
                  className={`rounded-lg border p-3 ${
                    focusedHandoffId === handoff.handoff_id
                      ? 'border-amber-500/70 bg-amber-950/20'
                      : 'border-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-100 truncate">
                        {handoff.title}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {handoff.handoff_type.replace('_', ' ')} -{' '}
                        {handoff.visibility_scope.replace('_', ' ')}
                      </p>
                    </div>
                    <span
                      className={`text-xs border rounded-full px-2 py-0.5 ${statusBadgeClass(
                        handoff.status
                      )}`}
                    >
                      {handoff.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-400 mt-2">
                    <p>Date: {handoff.event_date ?? 'TBD'}</p>
                    <p>Guests: {handoff.guest_count ?? 'TBD'}</p>
                    <p className="col-span-2">
                      Source:{' '}
                      {handoff.source_entity_type === 'manual'
                        ? 'Manual'
                        : `${handoff.source_entity_type ?? 'Unknown'}${handoff.source_entity_id ? ` (${handoff.source_entity_id})` : ''}`}
                    </p>
                    <p>Budget: {formatBudget(handoff.budget_cents)}</p>
                    <p>Recipients: {handoff.recipients.length}</p>
                    <p className="col-span-2">Expires: {formatDateTime(handoff.expires_at)}</p>
                  </div>
                  {Array.isArray((handoff.client_context as any)?.desired_cuisines) &&
                    (handoff.client_context as any).desired_cuisines.length > 0 && (
                      <p className="text-xs text-stone-400 mt-2">
                        Desired cuisines:{' '}
                        {(handoff.client_context as any).desired_cuisines.join(', ')}
                      </p>
                    )}

                  {handoff.private_note && (
                    <p className="text-sm text-stone-300 mt-2 whitespace-pre-wrap">
                      {handoff.private_note}
                    </p>
                  )}

                  {handoff.recipients.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {handoff.recipients.map((recipient) => (
                        <div
                          key={recipient.recipient_row_id}
                          className="flex items-center justify-between rounded-md border border-stone-700 px-2.5 py-1.5"
                        >
                          <span className="text-sm text-stone-300 truncate">
                            {recipient.chef.display_name || recipient.chef.business_name}
                          </span>
                          <div className="flex items-center gap-2">
                            {recipient.recipient_status === 'accepted' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-amber-400 hover:text-amber-300"
                                onClick={() =>
                                  setIntroModalOpen({
                                    handoffId: handoff.handoff_id,
                                    recipientChefId: recipient.chef.chef_id,
                                    recipientChefName:
                                      recipient.chef.display_name || recipient.chef.business_name,
                                  })
                                }
                                disabled={isPending}
                              >
                                Start Intro
                              </Button>
                            )}
                            <span
                              className={`text-xs border rounded-full px-2 py-0.5 ${statusBadgeClass(
                                recipient.recipient_status
                              )}`}
                            >
                              {renderRecipientStatus(recipient.recipient_status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(handoff.status === 'open' || handoff.status === 'partially_accepted') && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelOutgoing(handoff.handoff_id)}
                        disabled={isPending}
                      >
                        Cancel Handoff
                      </Button>
                    </div>
                  )}

                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleCopyHandoffLink(handoff.handoff_id)}
                      disabled={isPending}
                    >
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleToggleTimeline(handoff.handoff_id)}
                      disabled={isPending || timelineLoadingId === handoff.handoff_id}
                    >
                      {timelineLoadingId === handoff.handoff_id
                        ? 'Loading...'
                        : timelineOpen[handoff.handoff_id]
                          ? 'Hide Timeline'
                          : 'Timeline'}
                    </Button>
                  </div>

                  {timelineOpen[handoff.handoff_id] && (
                    <div className="mt-3 rounded-lg border border-stone-700 bg-stone-900/70 p-2.5">
                      {timelineByHandoff[handoff.handoff_id]?.length ? (
                        <div className="space-y-2">
                          {timelineByHandoff[handoff.handoff_id].map((event) => {
                            const actorName = event.actor
                              ? event.actor.display_name || event.actor.business_name
                              : 'System'
                            const metadataSummary = Object.entries(event.metadata ?? {})
                              .filter(([, value]) => value != null && String(value).trim() !== '')
                              .slice(0, 3)
                              .map(([key, value]) => `${key}: ${String(value)}`)
                              .join(' | ')

                            return (
                              <div
                                key={event.id}
                                className="rounded-md border border-stone-700 px-2.5 py-2"
                              >
                                <p className="text-xs text-stone-300">
                                  <span className="font-medium">{actorName}</span>{' '}
                                  {formatTimelineEvent(event.event_type).toLowerCase()}
                                </p>
                                <p className="text-xs-tight text-stone-500">
                                  {new Date(event.created_at).toLocaleString()}
                                </p>
                                {metadataSummary && (
                                  <p className="text-xs-tight text-stone-400 mt-1">
                                    {metadataSummary}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-stone-500">No timeline events yet.</p>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-stone-700 bg-stone-900 p-4">
        <h3 className="text-sm font-semibold text-stone-100">Availability Signals</h3>
        <p className="text-xs text-stone-400 mt-1">
          Share your windows for backup requests and lead swaps.
        </p>

        <form onSubmit={handleCreateSignal} className="space-y-3 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Start</label>
              <input
                type="date"
                value={signalStart}
                onChange={(event) => setSignalStart(event.target.value)}
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">End</label>
              <input
                type="date"
                value={signalEnd}
                onChange={(event) => setSignalEnd(event.target.value)}
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Status</label>
              <select
                value={signalStatus}
                onChange={(event) =>
                  setSignalStatus(event.target.value as 'available' | 'limited' | 'unavailable')
                }
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              >
                <option value="available">Available</option>
                <option value="limited">Limited</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">Max Guests</label>
              <input
                type="number"
                min={1}
                max={5000}
                value={signalMaxGuests}
                onChange={(event) => setSignalMaxGuests(event.target.value)}
                placeholder="Optional"
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={signalRegion}
              onChange={(event) => setSignalRegion(event.target.value)}
              placeholder="Region or city"
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              disabled={isPending}
            />
            <input
              value={signalCuisines}
              onChange={(event) => setSignalCuisines(event.target.value)}
              placeholder="Cuisines (comma-separated)"
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              disabled={isPending}
            />
          </div>

          <textarea
            value={signalNote}
            onChange={(event) => setSignalNote(event.target.value)}
            rows={2}
            placeholder="Optional context for other chefs."
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            disabled={isPending}
          />

          <label className="inline-flex items-center gap-2 text-sm text-stone-300">
            <input
              type="checkbox"
              checked={signalTrustedOnly}
              onChange={(event) => setSignalTrustedOnly(event.target.checked)}
              disabled={isPending}
            />
            Share only with trusted circle
          </label>

          <div className="flex justify-end">
            <Button size="sm" type="submit" disabled={isPending}>
              Add Availability Signal
            </Button>
          </div>
        </form>

        <div className="space-y-2 mt-4">
          {signals.length === 0 ? (
            <p className="text-sm text-stone-500">No availability signals posted yet.</p>
          ) : (
            signals.map((signal) => (
              <article key={signal.id} className="rounded-lg border border-stone-700 px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-100">
                      {signal.date_start} to {signal.date_end}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {signal.status} -{' '}
                      {signal.share_with_trusted_only ? 'Trusted only' : 'Connections'}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      {[
                        signal.region_text,
                        signal.max_guest_count ? `max ${signal.max_guest_count} guests` : null,
                      ]
                        .filter(Boolean)
                        .join(' - ') || 'No region constraints'}
                    </p>
                    {signal.cuisines.length > 0 && (
                      <p className="text-xs text-stone-400 mt-1">
                        Cuisines: {signal.cuisines.join(', ')}
                      </p>
                    )}
                    {signal.note && <p className="text-xs text-stone-400 mt-1">{signal.note}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteSignalConfirmId(signal.id)}
                    disabled={isPending}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      <ConfirmModal
        open={!!deleteSignalConfirmId}
        onCancel={() => setDeleteSignalConfirmId(null)}
        title="Delete availability signal?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteSignalConfirmId) handleDeleteSignal(deleteSignalConfirmId)
          setDeleteSignalConfirmId(null)
        }}
      />

      {/* Introduction Bridge Modal */}
      {introModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-xl">
            <h3 className="text-base font-semibold text-stone-100 mb-1">Start Introduction</h3>
            <p className="text-xs text-stone-400 mb-4">
              Introduce {introModalOpen.recipientChefName} to your client in a temporary three-party
              thread.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={introClientName}
                  onChange={(e) => setIntroClientName(e.target.value)}
                  placeholder="Client's name"
                  maxLength={200}
                  className="block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Client Email (optional)
                </label>
                <input
                  type="email"
                  value={introClientEmail}
                  onChange={(e) => setIntroClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Introduction Mode
                </label>
                <select
                  aria-label="Introduction Mode"
                  value={introMode}
                  onChange={(e) =>
                    setIntroMode(e.target.value as 'shared' | 'observer' | 'transfer')
                  }
                  className="block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100"
                >
                  <option value="shared">Shared (stay involved)</option>
                  <option value="observer">Observer (watch from sidelines)</option>
                  <option value="transfer">Transfer (hand off completely)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Intro Message (optional)
                </label>
                <textarea
                  value={introMessage}
                  onChange={(e) => setIntroMessage(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Hey! I'd love to introduce you two..."
                  className="block w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-stone-300">
                <input
                  type="checkbox"
                  checked={introCopyGuests}
                  onChange={(e) => setIntroCopyGuests(e.target.checked)}
                />
                Copy existing dinner circle guests to new circle
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIntroModalOpen(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartIntro}
                disabled={isPending || !introClientName.trim()}
              >
                {isPending ? 'Creating...' : 'Create Introduction'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
