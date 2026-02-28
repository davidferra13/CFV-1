'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmPolicyDialog } from '@/components/ui/confirm-policy-dialog'
import { SourceBadge } from '@/components/communication/source-badge'
import { getChannelMeta, channelLabel } from '@/lib/communication/channel-meta'
import {
  addInternalNoteFromCommunication,
  attachCommunicationEventToEvent,
  bulkMarkDone,
  bulkSnooze24h,
  bulkUnassign,
  createManualCommunicationLog,
  createInquiryFromCommunicationEvent,
  linkCommunicationEventToInquiry,
  markCommunicationResolved,
  reopenCommunication,
  snoozeThread,
  toggleThreadStar,
  unsnoozeThread,
} from '@/lib/communication/actions'
import type {
  CommunicationInboxStats,
  CommunicationTab,
  SuggestedLink,
} from '@/lib/communication/types'
import { mapErrorToUI } from '@/lib/errors/map-error-to-ui'
import { confirmPolicy, type ConfirmPolicyInput } from '@/lib/confirm/confirm-policy'

type TriageItem = {
  thread_id: string
  communication_event_id: string
  sender_identity: string
  source: string
  direction: 'inbound' | 'outbound'
  raw_content: string
  event_timestamp: string
  last_activity_at: string
  communication_status: string
  linked_entity_type: 'inquiry' | 'event' | null
  linked_entity_id: string | null
  linked_inquiry_title: string | null
  linked_event_title: string | null
  client_name: string | null
  has_overdue_follow_up: boolean
  next_follow_up_due_at: string | null
  thread_state: 'active' | 'snoozed' | 'closed'
  tab: 'unlinked' | 'needs_attention' | 'snoozed' | 'resolved'
  is_starred: boolean
  suggestions: SuggestedLink[]
}

type ResponseTurn = 'chef_to_respond' | 'waiting_on_client' | 'no_action'
type ResponseTurnFilter = 'all' | ResponseTurn
type FollowUpFilter = 'all' | 'overdue' | 'due_soon' | 'none'

const TABS: Array<{ key: CommunicationTab; label: string }> = [
  { key: 'unlinked', label: 'Unassigned' },
  { key: 'needs_attention', label: 'Action Required' },
  { key: 'snoozed', label: 'Snoozed' },
  { key: 'resolved', label: 'Done' },
]

const QUICK_REPLIES = [
  {
    label: 'Menu Proposal Sent',
    value: 'Menu proposal sent. Please review and share any edits you want before we lock it in.',
  },
  {
    label: 'Availability Confirmation',
    value:
      'I can confirm availability for your requested date and guest count. I can hold this slot while we finalize details.',
  },
  {
    label: 'Follow-up for Feedback',
    value:
      'Quick follow-up to see if you had any feedback or questions. Happy to adjust and move this forward whenever you are ready.',
  },
]

// sourceLabel replaced by channelLabel from channel-meta.ts

function formatWhen(value: string) {
  const date = new Date(value)
  return date.toLocaleString()
}

function getResponseTurn(item: TriageItem): ResponseTurn {
  if (
    item.thread_state === 'snoozed' ||
    item.thread_state === 'closed' ||
    item.communication_status === 'resolved'
  ) {
    return 'no_action'
  }
  return item.direction === 'inbound' ? 'chef_to_respond' : 'waiting_on_client'
}

function isStaleTheirTurn(item: TriageItem) {
  if (getResponseTurn(item) !== 'waiting_on_client') return false
  const elapsedMs = Date.now() - new Date(item.event_timestamp).getTime()
  return elapsedMs > 48 * 60 * 60 * 1000
}

function getFollowUpState(item: TriageItem): 'overdue' | 'due_soon' | 'none' {
  if (!item.next_follow_up_due_at) {
    return 'none'
  }

  const due = new Date(item.next_follow_up_due_at).getTime()
  const now = Date.now()
  if (due <= now || item.has_overdue_follow_up) {
    return 'overdue'
  }

  const oneDay = 24 * 60 * 60 * 1000
  if (due - now <= oneDay) {
    return 'due_soon'
  }
  return 'none'
}

export function CommunicationInboxClient({
  items,
  stats,
  initialTab,
}: {
  items: TriageItem[]
  stats: CommunicationInboxStats
  initialTab: CommunicationTab
}) {
  const [selectedTab, setSelectedTab] = useState<CommunicationTab>(initialTab)
  const allSources = useMemo(
    () => Array.from(new Set(items.map((item) => item.source))).sort(),
    [items]
  )
  const [activeSources, setActiveSources] = useState<string[]>(allSources)
  const [responseTurnFilter, setResponseTurnFilter] = useState<ResponseTurnFilter>('all')
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>('all')
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())
  const [manualOpen, setManualOpen] = useState(false)
  const [manualSender, setManualSender] = useState('')
  const [manualContent, setManualContent] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteTargetEventId, setNoteTargetEventId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmInput, setConfirmInput] = useState<ConfirmPolicyInput | null>(null)
  const pendingConfirmActionRef = useRef<null | (() => Promise<void>)>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    setActiveSources(allSources)
  }, [allSources])

  const filtered = useMemo(() => {
    const base = items.filter((item) => {
      if (item.tab !== selectedTab) return false
      if (!activeSources.includes(item.source)) return false

      const responseTurn = getResponseTurn(item)
      if (responseTurnFilter !== 'all' && responseTurn !== responseTurnFilter) return false

      const followUpState = getFollowUpState(item)
      if (followUpFilter !== 'all' && followUpState !== followUpFilter) return false

      return true
    })

    if (selectedTab === 'needs_attention') {
      return [...base].sort((a, b) => {
        if (a.is_starred === b.is_starred) {
          return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime()
        }
        return a.is_starred ? -1 : 1
      })
    }

    return base
  }, [items, selectedTab, activeSources, responseTurnFilter, followUpFilter])

  const selectedCount = selectedEventIds.size

  const executeAction = (fn: () => Promise<unknown>) => {
    startTransition(async () => {
      try {
        setActionError(null)
        await fn()
        router.refresh()
      } catch (error) {
        const uiError = mapErrorToUI(error)
        setActionError(uiError.message)
      }
    })
  }

  const runAction = (fn: () => Promise<unknown>, policyInput?: ConfirmPolicyInput) => {
    if (!policyInput) {
      executeAction(fn)
      return
    }
    const decision = confirmPolicy(policyInput)
    if (decision.mode === 'none') {
      executeAction(fn)
      return
    }
    pendingConfirmActionRef.current = async () => {
      await fn()
    }
    setConfirmInput(policyInput)
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    const fn = pendingConfirmActionRef.current
    setConfirmOpen(false)
    setConfirmInput(null)
    pendingConfirmActionRef.current = null
    if (!fn) return
    executeAction(fn)
  }

  const tabColorClasses: Record<CommunicationTab, string> = {
    unlinked: 'bg-blue-600 text-white border-blue-700',
    needs_attention: 'bg-orange-600 text-white border-orange-700',
    snoozed: 'bg-stone-700 text-white border-stone-800',
    resolved: 'bg-emerald-600 text-white border-emerald-700',
  }

  const responseFilterActiveClass: Record<ResponseTurnFilter, string> = {
    all: 'bg-stone-800 text-white border-stone-900',
    chef_to_respond: 'bg-indigo-600 text-white border-indigo-700',
    waiting_on_client: 'bg-amber-900 text-amber-100 border-amber-700',
    no_action: 'bg-emerald-600 text-white border-emerald-700',
  }

  const followUpFilterActiveClass: Record<FollowUpFilter, string> = {
    all: 'bg-stone-800 text-white border-stone-900',
    overdue: 'bg-red-600 text-white border-red-700',
    due_soon: 'bg-amber-900 text-amber-100 border-amber-700',
    none: 'bg-stone-700 text-white border-stone-800',
  }

  const bulkThreadIds = Array.from(
    new Set(
      filtered
        .filter((item) => selectedEventIds.has(item.communication_event_id))
        .map((item) => item.thread_id)
    )
  )

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count =
            tab.key === 'unlinked'
              ? stats.unlinked
              : tab.key === 'needs_attention'
                ? stats.needs_attention
                : tab.key === 'snoozed'
                  ? stats.snoozed
                  : stats.resolved

          const active = selectedTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`px-3 py-1.5 rounded-full border text-sm ${active ? tabColorClasses[tab.key] : 'bg-stone-900 text-stone-400 border-stone-600'}`}
            >
              {tab.label} ({count})
            </button>
          )
        })}
      </div>

      <div className="text-sm text-stone-400">{stats.total} total conversation threads</div>

      {actionError ? (
        <Alert variant="error" title="Action failed">
          {actionError}
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {allSources.map((source) => {
          const active = activeSources.includes(source)
          return (
            <button
              key={source}
              title={`Filter by ${channelLabel(source)}`}
              onClick={() => {
                setActiveSources((prev) => {
                  if (prev.includes(source)) {
                    return prev.length === 1 ? prev : prev.filter((s) => s !== source)
                  }
                  return [...prev, source]
                })
              }}
              className={`rounded-full border transition-opacity ${active ? 'border-stone-400 opacity-100' : 'border-stone-700 opacity-40'}`}
            >
              <SourceBadge source={source} size="md" />
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'chef_to_respond', label: 'My Turn' },
          { id: 'waiting_on_client', label: 'Their Turn' },
          { id: 'no_action', label: 'No Action' },
        ].map((filter) => {
          const active = responseTurnFilter === filter.id
          return (
            <button
              key={filter.id}
              onClick={() => setResponseTurnFilter(filter.id as ResponseTurnFilter)}
              className={`px-2.5 py-1 rounded-full border text-xs ${active ? responseFilterActiveClass[filter.id as ResponseTurnFilter] : 'bg-stone-800 text-stone-500 border-stone-700'}`}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Follow up' },
          { id: 'overdue', label: 'Past Due' },
          { id: 'due_soon', label: 'Upcoming' },
          { id: 'none', label: 'No Timer' },
        ].map((filter) => {
          const active = followUpFilter === filter.id
          return (
            <button
              key={filter.id}
              onClick={() => setFollowUpFilter(filter.id as FollowUpFilter)}
              className={`px-2.5 py-1 rounded-full border text-xs ${active ? followUpFilterActiveClass[filter.id as FollowUpFilter] : 'bg-stone-800 text-stone-500 border-stone-700'}`}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => setManualOpen(true)}
        >
          + Log New Message
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-stone-500">
            All caught up! No messages here.
          </CardContent>
        </Card>
      ) : (
        filtered.map((item) => {
          const inquirySuggestions = item.suggestions.filter(
            (s) => s.suggested_entity_type === 'inquiry' && s.status === 'pending'
          )
          const eventSuggestions = item.suggestions.filter(
            (s) => s.suggested_entity_type === 'event' && s.status === 'pending'
          )
          const responseTurn = getResponseTurn(item)
          const staleTheirTurn = isStaleTheirTurn(item)

          return (
            <Card
              key={item.communication_event_id}
              className="overflow-hidden"
              style={{ borderLeftWidth: 3, borderLeftColor: getChannelMeta(item.source).accentHex }}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-stone-400 bg-stone-900 accent-indigo-500"
                      checked={selectedEventIds.has(item.communication_event_id)}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setSelectedEventIds((prev) => {
                          const next = new Set(prev)
                          if (checked) next.add(item.communication_event_id)
                          else next.delete(item.communication_event_id)
                          return next
                        })
                      }}
                      aria-label="Select thread"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        runAction(() => toggleThreadStar(item.thread_id, !item.is_starred))
                      }
                      className="mt-0.5 text-amber-400 hover:text-amber-300"
                      aria-label={item.is_starred ? 'Unstar thread' : 'Star thread'}
                    >
                      <Star className={`h-4 w-4 ${item.is_starred ? 'fill-amber-400' : ''}`} />
                    </button>

                    <div>
                      <Link href={`/inbox/triage/${item.thread_id}`} className="hover:underline">
                        <CardTitle className="text-base">
                          {item.client_name || item.sender_identity}
                        </CardTitle>
                      </Link>
                      <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                        <SourceBadge source={item.source} size="md" />
                        <span>{formatWhen(item.event_timestamp)}</span>
                        {item.tab === 'unlinked' && (
                          <Badge className="bg-blue-900 text-blue-800 ring-1 ring-inset ring-blue-300">
                            Unassigned
                          </Badge>
                        )}
                        {item.tab === 'needs_attention' && (
                          <Badge className="bg-orange-900 text-orange-800 ring-1 ring-inset ring-orange-300">
                            Action Required
                          </Badge>
                        )}
                        {item.tab === 'resolved' && (
                          <Badge className="bg-emerald-900 text-emerald-800 ring-1 ring-inset ring-emerald-300">
                            Done
                          </Badge>
                        )}
                        {responseTurn === 'chef_to_respond' && (
                          <Badge className="bg-indigo-900 text-indigo-800 ring-1 ring-inset ring-indigo-300">
                            My Turn
                          </Badge>
                        )}
                        {responseTurn === 'waiting_on_client' && (
                          <Badge
                            className={
                              staleTheirTurn
                                ? 'bg-amber-900/50 text-amber-800/80 ring-1 ring-inset ring-amber-300/60'
                                : 'bg-amber-900 text-amber-800 ring-1 ring-inset ring-amber-300'
                            }
                          >
                            Their Turn
                          </Badge>
                        )}
                        {staleTheirTurn && (
                          <AlertTriangle
                            className="h-3.5 w-3.5 text-amber-500"
                            aria-label="Stale thread"
                          />
                        )}
                        {responseTurn === 'no_action' && <Badge variant="default">No action</Badge>}
                        {item.has_overdue_follow_up && (
                          <Badge className="bg-red-900 text-red-800 ring-1 ring-inset ring-red-300">
                            Past Due
                          </Badge>
                        )}
                        {item.thread_state === 'snoozed' && <Badge variant="info">Snoozed</Badge>}
                        {item.communication_status === 'resolved' && (
                          <Badge className="bg-emerald-900 text-emerald-800 ring-1 ring-inset ring-emerald-300">
                            Done
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.linked_entity_type === 'inquiry' && item.linked_entity_id && (
                      <Link
                        className="text-sm text-brand-400 underline"
                        href={`/inquiries/${item.linked_entity_id}`}
                      >
                        {item.linked_inquiry_title || 'View inquiry'}
                      </Link>
                    )}
                    {item.linked_entity_type === 'event' && item.linked_entity_id && (
                      <Link
                        className="text-sm text-brand-400 underline"
                        href={`/events/${item.linked_entity_id}`}
                      >
                        {item.linked_event_title || 'View event'}
                      </Link>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-stone-200 whitespace-pre-wrap">{item.raw_content}</p>

                {item.next_follow_up_due_at && (
                  <div className="text-xs text-stone-500">
                    Next follow-up due: {formatWhen(item.next_follow_up_due_at)}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() =>
                      runAction(() =>
                        createInquiryFromCommunicationEvent(item.communication_event_id)
                      )
                    }
                  >
                    Create Inquiry
                  </Button>

                  {item.thread_state === 'snoozed' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => runAction(() => unsnoozeThread(item.thread_id))}
                    >
                      Unsnooze
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => runAction(() => snoozeThread(item.thread_id, 24))}
                    >
                      Snooze 24h
                    </Button>
                  )}

                  {item.communication_status === 'resolved' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() =>
                        runAction(() => reopenCommunication(item.communication_event_id))
                      }
                    >
                      Reopen
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() =>
                        runAction(() => markCommunicationResolved(item.communication_event_id))
                      }
                    >
                      Mark Done
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => {
                      setNoteTargetEventId(item.communication_event_id)
                      setNoteText('')
                      setNoteOpen(true)
                    }}
                  >
                    Add Note
                  </Button>
                </div>

                {inquirySuggestions.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-stone-300">
                      Link to existing Inquiry
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {inquirySuggestions.map((s) => (
                        <Button
                          key={s.id}
                          size="sm"
                          variant="secondary"
                          disabled={isPending}
                          onClick={() =>
                            runAction(() =>
                              linkCommunicationEventToInquiry(
                                item.communication_event_id,
                                s.suggested_entity_id
                              )
                            )
                          }
                        >
                          Connect to Inquiry ({Math.round(s.confidence_score * 100)}%)
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {eventSuggestions.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-stone-300">Attach to Event</div>
                    <div className="flex flex-wrap gap-2">
                      {eventSuggestions.map((s) => (
                        <Button
                          key={s.id}
                          size="sm"
                          variant="secondary"
                          disabled={isPending}
                          onClick={() =>
                            runAction(() =>
                              attachCommunicationEventToEvent(
                                item.communication_event_id,
                                s.suggested_entity_id
                              )
                            )
                          }
                        >
                          Attach Event ({Math.round(s.confidence_score * 100)}%)
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}

      {selectedCount > 0 && (
        <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-3xl rounded-xl border border-stone-700 bg-stone-900/95 backdrop-blur p-3 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-stone-100">{selectedCount} selected</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      async () => {
                        await bulkMarkDone(Array.from(selectedEventIds))
                        setSelectedEventIds(new Set())
                      },
                      {
                        risk: 'medium',
                        reversible: true,
                        entityName: `${selectedCount} threads`,
                        impactPreview: 'Selected items will be marked done.',
                        actionLabel: 'Bulk Mark Done',
                      }
                    )
                  }
                >
                  Bulk Mark Done
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      async () => {
                        await bulkSnooze24h(bulkThreadIds)
                        setSelectedEventIds(new Set())
                      },
                      {
                        risk: 'medium',
                        reversible: true,
                        entityName: `${selectedCount} threads`,
                        impactPreview: 'Selected threads will be snoozed for 24 hours.',
                        actionLabel: 'Bulk Snooze',
                      }
                    )
                  }
                >
                  Bulk Snooze (24h)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      async () => {
                        await bulkUnassign(Array.from(selectedEventIds))
                        setSelectedEventIds(new Set())
                      },
                      {
                        risk: 'medium',
                        reversible: true,
                        entityName: `${selectedCount} threads`,
                        impactPreview: 'Selected threads will be unassigned from linked entities.',
                        actionLabel: 'Bulk Unassign',
                      }
                    )
                  }
                >
                  Bulk Unassign
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-stone-700 bg-stone-900 text-stone-100 p-4 space-y-3">
            <h3 className="text-lg font-semibold">+ Log New Message</h3>
            <input
              value={manualSender}
              onChange={(e) => setManualSender(e.target.value)}
              placeholder="Sender identity (name, email, or phone)"
              className="w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm"
            />
            <div className="space-y-1">
              <label className="text-xs text-stone-400">Quick Replies (Chef Specials)</label>
              <select
                title="Quick replies"
                className="w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm"
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return
                  setManualContent(e.target.value)
                }}
              >
                <option value="">Select a quick reply</option>
                {QUICK_REPLIES.map((reply) => (
                  <option key={reply.label} value={reply.value}>
                    {reply.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              placeholder="Message content"
              rows={5}
              className="w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setManualOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() =>
                  runAction(async () => {
                    await createManualCommunicationLog({
                      senderIdentity: manualSender,
                      content: manualContent,
                    })
                    setManualOpen(false)
                    setManualSender('')
                    setManualContent('')
                  })
                }
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {noteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-stone-700 bg-stone-900 text-stone-100 p-4 space-y-3">
            <h3 className="text-lg font-semibold">Add Note</h3>
            <div className="space-y-1">
              <label className="text-xs text-stone-400">Quick Replies (Chef Specials)</label>
              <select
                title="Quick replies"
                className="w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm"
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return
                  setNoteText(e.target.value)
                }}
              >
                <option value="">Select a quick reply</option>
                {QUICK_REPLIES.map((reply) => (
                  <option key={reply.label} value={reply.value}>
                    {reply.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Internal note"
              rows={5}
              className="w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending || !noteTargetEventId}
                onClick={() =>
                  runAction(async () => {
                    if (!noteTargetEventId) return
                    await addInternalNoteFromCommunication(noteTargetEventId, noteText)
                    setNoteOpen(false)
                    setNoteTargetEventId(null)
                    setNoteText('')
                  })
                }
              >
                Save Note
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmPolicyDialog
        open={confirmOpen}
        policy={confirmInput}
        loading={isPending}
        onCancel={() => {
          setConfirmOpen(false)
          setConfirmInput(null)
          pendingConfirmActionRef.current = null
        }}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
