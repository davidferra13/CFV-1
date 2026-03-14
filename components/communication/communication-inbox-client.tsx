'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Star,
  Mail,
  Phone,
  MessageSquare,
  Keyboard,
  Volume2,
  VolumeX,
  ArrowDown,
  ArrowUp,
  ListFilter,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmPolicyDialog } from '@/components/ui/confirm-policy-dialog'
import { SourceBadge } from '@/components/communication/source-badge'
import {
  FormattedCommunicationContent,
  getCommunicationPreviewText,
} from '@/components/communication/message-content'
import { getChannelMeta, channelLabel } from '@/lib/communication/channel-meta'
import {
  addInternalNoteFromCommunication,
  attachCommunicationEventToEvent,
  bulkMarkDone,
  bulkSnooze24h,
  bulkUnassign,
  createManualCommunicationLog,
  createInquiryFromCommunicationEvent,
  getRawCommunicationFeed,
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

type RawFeedItem = {
  id: string
  source: string
  timestamp: string
  sender_identity: string
  raw_content: string
  direction: 'inbound' | 'outbound'
  thread_id: string
  status: string
  linked_entity_type: string | null
  is_dinner_opportunity: boolean
  platform: 'takeachef' | 'yhangry' | null
  platform_email_type: string | null
}

type ResponseTurn = 'chef_to_respond' | 'waiting_on_client' | 'no_action'
type ResponseTurnFilter = 'all' | ResponseTurn
type FollowUpFilter = 'all' | 'overdue' | 'due_soon' | 'none'
type ViewMode = 'triage' | 'raw_feed'

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

function formatWhen(value: string) {
  const date = new Date(value)
  return date.toLocaleString()
}

function timeAgo(value: string) {
  const ms = Date.now() - new Date(value).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
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
  unreadCount = 0,
  gmailConnected = false,
}: {
  items: TriageItem[]
  stats: CommunicationInboxStats
  initialTab: CommunicationTab
  unreadCount?: number
  gmailConnected?: boolean
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('triage')
  const [selectedTab, setSelectedTab] = useState<CommunicationTab>(initialTab)
  // Local stats state for optimistic updates — syncs from server on refresh
  const [localStats, setLocalStats] = useState<CommunicationInboxStats>(stats)
  useEffect(() => {
    setLocalStats(stats)
  }, [stats])
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

  // Keyboard shortcut state
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  // Notification sound preference (persisted in localStorage)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('inbox-sound') !== 'false'
  })

  // Lazy-load raw feed on demand
  const [rawFeed, setRawFeed] = useState<RawFeedItem[]>([])
  const [rawFeedLoaded, setRawFeedLoaded] = useState(false)
  const [rawFeedDinnerOnly, setRawFeedDinnerOnly] = useState(true)
  useEffect(() => {
    if (viewMode === 'raw_feed' && !rawFeedLoaded) {
      let cancelled = false
      getRawCommunicationFeed(200).then((data) => {
        if (!cancelled) {
          setRawFeed(data as RawFeedItem[])
          setRawFeedLoaded(true)
        }
      })
      return () => {
        cancelled = true
      }
    }
  }, [viewMode, rawFeedLoaded])

  const rawFeedFiltered = useMemo(
    () => (rawFeedDinnerOnly ? rawFeed.filter((m) => m.is_dinner_opportunity) : rawFeed),
    [rawFeed, rawFeedDinnerOnly]
  )

  useEffect(() => {
    setActiveSources(allSources)
  }, [allSources])

  // Play notification sound when unread count increases (5s cooldown)
  const prevUnreadRef = useRef(unreadCount)
  const lastSoundPlayedRef = useRef(0)
  useEffect(() => {
    if (soundEnabled && unreadCount > prevUnreadRef.current) {
      const now = Date.now()
      if (now - lastSoundPlayedRef.current >= 5000) {
        try {
          const ctx = new AudioContext()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 880
          osc.type = 'sine'
          gain.gain.value = 0.1
          osc.start()
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
          osc.stop(ctx.currentTime + 0.3)
          lastSoundPlayedRef.current = now
        } catch {
          // AudioContext not available
        }
      }
    }
    prevUnreadRef.current = unreadCount
  }, [unreadCount, soundEnabled])

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

  const executeAction = (
    fn: () => Promise<unknown>,
    statsDelta?: Partial<CommunicationInboxStats>
  ) => {
    // Optimistic stats update — revert on failure
    const prevStats = { ...localStats }
    if (statsDelta) {
      setLocalStats((s) => {
        const next = { ...s }
        for (const [k, v] of Object.entries(statsDelta)) {
          ;(next as any)[k] = Math.max(0, ((s as any)[k] ?? 0) + (v as number))
        }
        return next
      })
    }
    startTransition(async () => {
      try {
        setActionError(null)
        await fn()
        router.refresh()
      } catch (error) {
        if (statsDelta) setLocalStats(prevStats) // rollback
        const uiError = mapErrorToUI(error)
        setActionError(uiError.message)
      }
    })
  }

  const pendingStatsDeltaRef = useRef<Partial<CommunicationInboxStats> | undefined>(undefined)

  const runAction = (
    fn: () => Promise<unknown>,
    policyInput?: ConfirmPolicyInput,
    statsDelta?: Partial<CommunicationInboxStats>
  ) => {
    if (!policyInput) {
      executeAction(fn, statsDelta)
      return
    }
    const decision = confirmPolicy(policyInput)
    if (decision.mode === 'none') {
      executeAction(fn, statsDelta)
      return
    }
    pendingConfirmActionRef.current = async () => {
      await fn()
    }
    pendingStatsDeltaRef.current = statsDelta
    setConfirmInput(policyInput)
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    const fn = pendingConfirmActionRef.current
    const sd = pendingStatsDeltaRef.current
    setConfirmOpen(false)
    setConfirmInput(null)
    pendingConfirmActionRef.current = null
    pendingStatsDeltaRef.current = undefined
    if (!fn) return
    executeAction(fn, sd)
  }

  // ─── Keyboard Shortcuts ─────────────────────────────────
  const handleKeyboard = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture when typing in inputs/textareas or when modals are open
      if (!shortcutsEnabled) return
      if (viewMode !== 'triage') return
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      )
        return
      if (manualOpen || noteOpen || confirmOpen) return

      const maxIdx = filtered.length - 1
      if (maxIdx < 0) return

      switch (e.key) {
        case 'j':
        case 'ArrowDown': {
          e.preventDefault()
          setFocusedIndex((prev) => {
            const next = Math.min(prev + 1, maxIdx)
            cardRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            return next
          })
          break
        }
        case 'k':
        case 'ArrowUp': {
          e.preventDefault()
          setFocusedIndex((prev) => {
            const next = Math.max(prev - 1, 0)
            cardRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            return next
          })
          break
        }
        case 'e': {
          e.preventDefault()
          const item = filtered[focusedIndex]
          if (!item) return
          if (item.communication_status === 'resolved') {
            const fromTab = 'resolved' as CommunicationTab
            executeAction(() => reopenCommunication(item.communication_event_id), {
              resolved: -1,
              [item.tab === fromTab ? 'unlinked' : item.tab]: 1,
            })
          } else {
            executeAction(() => markCommunicationResolved(item.communication_event_id), {
              [item.tab]: -1,
              resolved: 1,
            })
          }
          break
        }
        case 's': {
          e.preventDefault()
          const item = filtered[focusedIndex]
          if (!item) return
          if (item.thread_state === 'snoozed') {
            executeAction(() => unsnoozeThread(item.thread_id), {
              snoozed: -1,
              unlinked: 1,
            })
          } else {
            executeAction(() => snoozeThread(item.thread_id, 24), {
              [item.tab]: -1,
              snoozed: 1,
            })
          }
          break
        }
        case 'x': {
          e.preventDefault()
          const item = filtered[focusedIndex]
          if (!item) return
          setSelectedEventIds((prev) => {
            const next = new Set(prev)
            if (next.has(item.communication_event_id)) next.delete(item.communication_event_id)
            else next.add(item.communication_event_id)
            return next
          })
          break
        }
        case 'Enter': {
          e.preventDefault()
          const item = filtered[focusedIndex]
          if (!item) return
          router.push(`/inbox/triage/${item.thread_id}`)
          break
        }
        case '*': {
          e.preventDefault()
          const item = filtered[focusedIndex]
          if (!item) return
          executeAction(() => toggleThreadStar(item.thread_id, !item.is_starred))
          break
        }
      }
    },
    [
      shortcutsEnabled,
      viewMode,
      manualOpen,
      noteOpen,
      confirmOpen,
      filtered,
      focusedIndex,
      router,
      executeAction,
    ]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [handleKeyboard])

  // Reset focus when filtered items change
  useEffect(() => {
    setFocusedIndex(-1)
  }, [selectedTab, activeSources, responseTurnFilter, followUpFilter])

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

  // Check if inbox is truly empty (no items at all, not just filtered empty)
  const isNewUser = items.length === 0

  return (
    <div className="space-y-4 pb-24">
      {/* View mode toggle + utilities */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('triage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'triage'
                ? 'bg-brand-950 text-brand-400'
                : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            Smart Inbox
            {unreadCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-red-600 text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setViewMode('raw_feed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'raw_feed'
                ? 'bg-stone-700 text-stone-200'
                : 'bg-stone-900 text-stone-500 hover:bg-stone-800'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Raw Feed
            {rawFeedLoaded && (
              <span className="text-[10px] text-stone-500">({rawFeed.length})</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <button
            onClick={() => {
              const next = !soundEnabled
              setSoundEnabled(next)
              localStorage.setItem('inbox-sound', String(next))
            }}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
            title={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          {/* Keyboard shortcut hint */}
          <button
            onClick={() => setShortcutsEnabled((prev) => !prev)}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
              shortcutsEnabled
                ? 'text-brand-400 bg-brand-950'
                : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
            }`}
            title={
              shortcutsEnabled
                ? 'Keyboard shortcuts ON — j/k navigate, e done, s snooze, x select, * star, Enter open'
                : 'Keyboard shortcuts OFF'
            }
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── RAW FEED VIEW ─────────────────────────────────── */}
      {viewMode === 'raw_feed' ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-stone-700/50 bg-stone-900/50 px-4 py-3">
            <p className="text-sm text-stone-400">
              Raw Feed keeps chronological order and preserves duplicates. Dinner Only mode shows
              every detected dinner opportunity (including repeats), so you can trust what is coming
              in without checking Gmail.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setRawFeedDinnerOnly(true)}
                className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${rawFeedDinnerOnly ? 'bg-brand-500 text-white border-brand-500' : 'text-stone-400 border-stone-600 hover:text-white'}`}
              >
                Dinner Only ({rawFeed.filter((m) => m.is_dinner_opportunity).length})
              </button>
              <button
                onClick={() => setRawFeedDinnerOnly(false)}
                className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${!rawFeedDinnerOnly ? 'bg-brand-500 text-white border-brand-500' : 'text-stone-400 border-stone-600 hover:text-white'}`}
              >
                All Messages ({rawFeed.length})
              </button>
            </div>
          </div>

          {!rawFeedLoaded ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-stone-500">
                Loading raw feed...
              </CardContent>
            </Card>
          ) : rawFeedFiltered.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-stone-500">
                {rawFeedDinnerOnly
                  ? 'No dinner opportunities detected in the current raw feed window.'
                  : 'No messages yet. Connect Gmail or log a message to get started.'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {rawFeedFiltered.map((msg) => (
                <Link
                  key={msg.id}
                  href={`/inbox/triage/${msg.thread_id}`}
                  className="flex items-start gap-3 rounded-lg border border-stone-800 bg-stone-900 px-3 py-2.5 hover:bg-stone-800/80 transition-colors group"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <SourceBadge source={msg.source} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-200 truncate">
                        {msg.sender_identity}
                      </span>
                      <span className="text-[10px] text-stone-600 flex-shrink-0">
                        {timeAgo(msg.timestamp)}
                      </span>
                      {msg.direction === 'outbound' && (
                        <span className="text-[10px] text-indigo-400 flex-shrink-0">You</span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 truncate mt-0.5">
                      {getCommunicationPreviewText(msg.raw_content, 180)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    {msg.is_dinner_opportunity && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-950 text-brand-400 border border-brand-800">
                        dinner
                      </span>
                    )}
                    {msg.platform_email_type && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                        {msg.platform_email_type.replace(/^tac_/, '').replace(/^yhangry_/, '')}
                      </span>
                    )}
                    {msg.linked_entity_type && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                        {msg.linked_entity_type}
                      </span>
                    )}
                    {msg.status === 'resolved' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-400">
                        done
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ─── EMPTY STATE / ONBOARDING ────────────────────── */}
          {isNewUser ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-stone-700 bg-gradient-to-br from-stone-900 to-stone-800 p-8 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-950 mx-auto">
                  <Mail className="h-8 w-8 text-brand-400" />
                </div>
                <h2 className="text-xl font-bold text-stone-100">Your inbox is ready</h2>
                <p className="text-stone-400 max-w-md mx-auto">
                  Every inquiry — email, text, Instagram DM, marketplace lead — lands here in one
                  place. Connect your channels to get started.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  {!gmailConnected && (
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-500 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      Connect Gmail
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setManualOpen(true)}
                    className="gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Log a Phone Call
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setManualOpen(true)}
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Log a Message
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-stone-800 bg-stone-900 p-4 space-y-2">
                  <div className="text-sm font-medium text-stone-300">Auto-detected</div>
                  <p className="text-xs text-stone-500">
                    TakeAChef, Thumbtack, TheKnot, Bark, and more — recognized automatically from
                    your Gmail.
                  </p>
                </div>
                <div className="rounded-xl border border-stone-800 bg-stone-900 p-4 space-y-2">
                  <div className="text-sm font-medium text-stone-300">Cross-channel merge</div>
                  <p className="text-xs text-stone-500">
                    Same client from email + text + marketplace = one thread, not three duplicates.
                  </p>
                </div>
                <div className="rounded-xl border border-stone-800 bg-stone-900 p-4 space-y-2">
                  <div className="text-sm font-medium text-stone-300">Noise filtered</div>
                  <p className="text-xs text-stone-500">
                    Payment receipts, marketing emails, and spam are automatically archived.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ─── TRIAGE VIEW ─────────────────────────────── */}
              {/* Tabs */}
              <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => {
                  const count =
                    tab.key === 'unlinked'
                      ? localStats.unlinked
                      : tab.key === 'needs_attention'
                        ? localStats.needs_attention
                        : tab.key === 'snoozed'
                          ? localStats.snoozed
                          : localStats.resolved

                  const active = selectedTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setSelectedTab(tab.key)}
                      className={`px-3 py-2 sm:py-1.5 rounded-full border text-sm min-h-[44px] sm:min-h-0 ${active ? tabColorClasses[tab.key] : 'bg-stone-900 text-stone-400 border-stone-600'}`}
                    >
                      {tab.label} ({count})
                    </button>
                  )
                })}
              </div>

              <div className="text-sm text-stone-400">
                {localStats.total} total conversation threads
              </div>

              {actionError ? (
                <Alert variant="error" title="Action failed">
                  {actionError}
                </Alert>
              ) : null}

              {/* Source filters — horizontally scrollable on mobile */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
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
                      className={`flex-shrink-0 rounded-full border transition-opacity ${active ? 'border-stone-400 opacity-100' : 'border-stone-700 opacity-40'}`}
                    >
                      <SourceBadge source={source} size="md" />
                    </button>
                  )
                })}
              </div>

              {/* Response turn + follow-up filters — wrap on mobile */}
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
                      className={`px-2.5 py-1.5 sm:py-1 rounded-full border text-xs min-h-[36px] sm:min-h-0 ${active ? responseFilterActiveClass[filter.id as ResponseTurnFilter] : 'bg-stone-800 text-stone-500 border-stone-700'}`}
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
                      className={`px-2.5 py-1.5 sm:py-1 rounded-full border text-xs min-h-[36px] sm:min-h-0 ${active ? followUpFilterActiveClass[filter.id as FollowUpFilter] : 'bg-stone-800 text-stone-500 border-stone-700'}`}
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

              {/* Keyboard shortcut hint bar */}
              {shortcutsEnabled && focusedIndex >= 0 && (
                <div className="flex items-center gap-3 text-[10px] text-stone-500 px-1">
                  <span>
                    <kbd className="px-1 py-0.5 rounded bg-stone-800 text-stone-400 font-mono">
                      j
                    </kbd>
                    <kbd className="px-1 py-0.5 rounded bg-stone-800 text-stone-400 font-mono ml-0.5">
                      k
                    </kbd>{' '}
                    nav
                  </span>
                  <span>
                    <kbd className="px-1 py-0.5 rounded bg-stone-800 text-stone-400 font-mono">
                      e
                    </kbd>{' '}
                    done
                  </span>
                  <span>
                    <kbd className="px-1 py-0.5 rounded bg-stone-800 text-stone-400 font-mono">
                      s
                    </kbd>{' '}
                    snooze
                  </span>
                  <span>
                    <kbd className="px-1 py-0.5 rounded bg-stone-800 text-stone-400 font-mono">
                      x
                    </kbd>{' '}
                    select
                  </span>
                  <span>
                    <kbd className="px-1 py-0.5 rounded bg-stone-800 text-stone-400 font-mono">
                      *
                    </kbd>{' '}
                    star
                  </span>
                  <span>
                    <kbd className="px-1 py-0.5 rounded bg-stone-800 text-stone-400 font-mono">
                      Enter
                    </kbd>{' '}
                    open
                  </span>
                </div>
              )}

              {filtered.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-sm text-stone-500">
                    All caught up! No messages here.
                  </CardContent>
                </Card>
              ) : (
                filtered.map((item, idx) => {
                  const inquirySuggestions = item.suggestions.filter(
                    (s) => s.suggested_entity_type === 'inquiry' && s.status === 'pending'
                  )
                  const eventSuggestions = item.suggestions.filter(
                    (s) => s.suggested_entity_type === 'event' && s.status === 'pending'
                  )
                  const responseTurn = getResponseTurn(item)
                  const staleTheirTurn = isStaleTheirTurn(item)
                  const isFocused = focusedIndex === idx

                  return (
                    <Card
                      key={item.communication_event_id}
                      ref={(el) => {
                        cardRefs.current[idx] = el
                      }}
                      className={`overflow-hidden transition-shadow ${isFocused ? 'ring-2 ring-brand-500 shadow-lg shadow-brand-500/10' : ''}`}
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor: getChannelMeta(item.source).accentHex,
                      }}
                    >
                      <CardHeader className="p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                            <input
                              type="checkbox"
                              className="mt-1 h-5 w-5 sm:h-4 sm:w-4 rounded border-stone-400 bg-stone-900 accent-indigo-500 flex-shrink-0"
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
                              className="mt-0.5 text-amber-400 hover:text-amber-300 flex-shrink-0 p-1 -m-1"
                              aria-label={item.is_starred ? 'Unstar thread' : 'Star thread'}
                            >
                              <Star
                                className={`h-4 w-4 ${item.is_starred ? 'fill-amber-400' : ''}`}
                              />
                            </button>

                            <div className="min-w-0">
                              <Link
                                href={`/inbox/triage/${item.thread_id}`}
                                className="hover:underline"
                              >
                                <CardTitle className="text-base truncate">
                                  {item.client_name || item.sender_identity}
                                </CardTitle>
                              </Link>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-stone-500">
                                <SourceBadge source={item.source} size="md" />
                                <span className="hidden sm:inline">
                                  {formatWhen(item.event_timestamp)}
                                </span>
                                <span className="sm:hidden">{timeAgo(item.event_timestamp)}</span>
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
                                {responseTurn === 'no_action' && (
                                  <Badge variant="default">No action</Badge>
                                )}
                                {item.has_overdue_follow_up && (
                                  <Badge className="bg-red-900 text-red-800 ring-1 ring-inset ring-red-300">
                                    Past Due
                                  </Badge>
                                )}
                                {item.thread_state === 'snoozed' && (
                                  <Badge variant="info">Snoozed</Badge>
                                )}
                                {item.communication_status === 'resolved' && (
                                  <Badge className="bg-emerald-900 text-emerald-800 ring-1 ring-inset ring-emerald-300">
                                    Done
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            {item.linked_entity_type === 'inquiry' && item.linked_entity_id && (
                              <Link
                                className="text-xs sm:text-sm text-brand-400 underline hidden sm:inline"
                                href={`/inquiries/${item.linked_entity_id}`}
                              >
                                {item.linked_inquiry_title || 'View inquiry'}
                              </Link>
                            )}
                            {item.linked_entity_type === 'event' && item.linked_entity_id && (
                              <Link
                                className="text-xs sm:text-sm text-brand-400 underline hidden sm:inline"
                                href={`/events/${item.linked_entity_id}`}
                              >
                                {item.linked_event_title || 'View event'}
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-4">
                        <FormattedCommunicationContent content={item.raw_content} compact />

                        {item.next_follow_up_due_at && (
                          <div className="text-xs text-stone-500">
                            Next follow-up due: {formatWhen(item.next_follow_up_due_at)}
                          </div>
                        )}

                        {/* Action buttons — wrap better on mobile */}
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                              onClick={() =>
                                runAction(() => unsnoozeThread(item.thread_id), undefined, {
                                  snoozed: -1,
                                  unlinked: 1,
                                })
                              }
                            >
                              Unsnooze
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={isPending}
                              onClick={() =>
                                runAction(() => snoozeThread(item.thread_id, 24), undefined, {
                                  [item.tab]: -1,
                                  snoozed: 1,
                                })
                              }
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
                                runAction(
                                  () => reopenCommunication(item.communication_event_id),
                                  undefined,
                                  { resolved: -1, unlinked: 1 }
                                )
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
                                runAction(
                                  () => markCommunicationResolved(item.communication_event_id),
                                  undefined,
                                  { [item.tab]: -1, resolved: 1 }
                                )
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
                            <div className="text-xs font-medium text-stone-300">
                              Attach to Event
                            </div>
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
            </>
          )}
        </>
      )}

      {/* Bulk actions bar */}
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
                      },
                      { [selectedTab]: -selectedCount, resolved: selectedCount }
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
                      },
                      { [selectedTab]: -selectedCount, snoozed: selectedCount }
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

      {/* Manual log modal */}
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

      {/* Note modal */}
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
