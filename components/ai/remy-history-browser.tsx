'use client'

import { useState, useEffect, useCallback, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Bot,
  Pin,
  PinOff,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MessageCircle,
  Trash2,
  Clock,
  ArrowRight,
  Loader2,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { RemyConversation } from '@/lib/ai/remy-conversation-actions'
import {
  searchConversations,
  loadConversationMessages,
  deleteConversation,
  getConversationMessageCounts,
} from '@/lib/ai/remy-conversation-actions'
import type { RemyMessage } from '@/lib/ai/remy-types'

// ---- localStorage pin management ----

const PINNED_KEY = 'cf:remy:pinned-conversations'

function getPinnedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(PINNED_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function savePinnedIds(ids: Set<string>) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(Array.from(ids)))
}

// ---- Date grouping ----

type DateGroup = 'Pinned' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Older'

function getDateGroup(dateStr: string, isPinned: boolean): DateGroup {
  if (isPinned) return 'Pinned'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0 && date.toDateString() === now.toDateString()) return 'Today'
  if (diffDays <= 1) return 'Yesterday'
  if (diffDays <= 7) return 'This Week'
  if (diffDays <= 30) return 'This Month'
  return 'Older'
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

// ---- Props ----

interface Props {
  initialConversations: RemyConversation[]
  initialTotal: number
}

const GROUP_ORDER: DateGroup[] = [
  'Pinned',
  'Today',
  'Yesterday',
  'This Week',
  'This Month',
  'Older',
]

export function RemyHistoryBrowser({ initialConversations, initialTotal }: Props) {
  const router = useRouter()
  const [conversations, setConversations] = useState(initialConversations)
  const [total] = useState(initialTotal)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RemyConversation[] | null>(null)
  const [searching, startSearch] = useTransition()
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedMessages, setExpandedMessages] = useState<RemyMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<DateGroup>>(new Set())
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({})

  // Load pinned IDs and message counts on mount
  useEffect(() => {
    setPinnedIds(getPinnedIds())
  }, [])

  useEffect(() => {
    const ids = conversations.map((c) => c.id)
    if (ids.length === 0) return
    getConversationMessageCounts(ids)
      .then(setMessageCounts)
      .catch(() => {})
  }, [conversations])

  // Search handler with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }

    const timer = setTimeout(() => {
      startSearch(async () => {
        try {
          const result = await searchConversations(searchQuery.trim())
          setSearchResults(result.conversations)
        } catch {
          toast.error('Search failed')
        }
      })
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Toggle pin
  const handleTogglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      savePinnedIds(next)
      return next
    })
  }, [])

  // Expand conversation to show messages
  const handleExpand = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null)
        setExpandedMessages([])
        return
      }

      setExpandedId(id)
      setLoadingMessages(true)
      try {
        const messages = await loadConversationMessages(id)
        setExpandedMessages(messages)
      } catch {
        toast.error('Failed to load messages')
        setExpandedId(null)
      } finally {
        setLoadingMessages(false)
      }
    },
    [expandedId]
  )

  // Delete conversation
  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      try {
        await deleteConversation(id)
        setConversations((prev) => prev.filter((c) => c.id !== id))
        if (expandedId === id) {
          setExpandedId(null)
          setExpandedMessages([])
        }
        toast.success('Conversation deleted')
      } catch {
        toast.error('Failed to delete')
      }
    },
    [expandedId]
  )

  // Toggle group collapse
  const toggleGroup = useCallback((group: DateGroup) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }, [])

  // Group conversations by date
  const displayConversations = searchResults ?? conversations
  const grouped = useMemo(() => {
    const groups: Record<DateGroup, RemyConversation[]> = {
      Pinned: [],
      Today: [],
      Yesterday: [],
      'This Week': [],
      'This Month': [],
      Older: [],
    }

    for (const conv of displayConversations) {
      const isPinned = pinnedIds.has(conv.id)
      const group = getDateGroup(conv.updatedAt, isPinned)
      groups[group].push(conv)
    }

    return groups
  }, [displayConversations, pinnedIds])

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-stone-700 bg-stone-800 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 animate-spin" />
        )}
      </div>

      {/* Results summary */}
      <p className="text-xs text-stone-500">
        {searchResults
          ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
          : `${total} conversation${total !== 1 ? 's' : ''}`}
      </p>

      {/* Empty state */}
      {displayConversations.length === 0 && (
        <div className="text-center py-16">
          <Bot className="h-12 w-12 text-stone-600 mx-auto mb-3" />
          <p className="text-sm text-stone-400">
            {searchQuery
              ? 'No conversations match your search.'
              : 'No conversations yet. Start chatting with Remy to see your history here.'}
          </p>
        </div>
      )}

      {/* Grouped conversations */}
      {GROUP_ORDER.map((group) => {
        const items = grouped[group]
        if (items.length === 0) return null

        const isCollapsed = collapsedGroups.has(group)

        return (
          <div key={group} className="space-y-2">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group)}
              className="flex items-center gap-2 w-full text-left py-1"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-stone-500" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-stone-500" />
              )}
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                {group}
              </span>
              <span className="text-xs text-stone-600">({items.length})</span>
            </button>

            {/* Conversation cards */}
            {!isCollapsed && (
              <div className="space-y-2">
                {items.map((conv) => {
                  const isPinned = pinnedIds.has(conv.id)
                  const isExpanded = expandedId === conv.id
                  const count = messageCounts[conv.id] ?? 0

                  return (
                    <div
                      key={conv.id}
                      className={`rounded-xl border transition-colors ${
                        isPinned
                          ? 'border-brand-700 bg-brand-950/30'
                          : 'border-stone-700 bg-stone-800'
                      }`}
                    >
                      {/* Card header */}
                      <div
                        className="flex items-start gap-3 p-4 cursor-pointer"
                        onClick={() => handleExpand(conv.id)}
                      >
                        <MessageCircle className="h-4 w-4 text-stone-500 mt-0.5 flex-shrink-0" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-medium text-stone-100 truncate">
                                {conv.title || 'Untitled conversation'}
                              </h3>
                              {conv.lastMessage && (
                                <p className="text-xs text-stone-500 mt-0.5 truncate">
                                  {conv.lastMessage}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-xs text-stone-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(conv.updatedAt)}
                                </span>
                                {count > 0 && (
                                  <Badge variant="default">
                                    {count} msg{count !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTogglePin(conv.id)
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isPinned
                                    ? 'text-brand-500 hover:text-brand-400'
                                    : 'text-stone-500 hover:text-stone-300'
                                }`}
                                title={isPinned ? 'Unpin' : 'Pin'}
                              >
                                {isPinned ? (
                                  <PinOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Pin className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                onClick={(e) => handleDelete(conv.id, e)}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <div className="p-1.5">
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5 text-stone-500" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5 text-stone-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded: message thread */}
                      {isExpanded && (
                        <div className="border-t border-stone-700 px-4 pb-4">
                          {loadingMessages ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-5 w-5 text-stone-400 animate-spin" />
                            </div>
                          ) : (
                            <>
                              <div className="space-y-3 mt-3 max-h-96 overflow-y-auto">
                                {expandedMessages.map((msg) => (
                                  <div
                                    key={msg.id}
                                    className={`rounded-lg p-3 text-sm ${
                                      msg.role === 'user'
                                        ? 'bg-stone-700/50 text-stone-200 ml-8'
                                        : 'bg-brand-950/30 text-stone-300 mr-8'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-medium text-stone-400">
                                        {msg.role === 'user' ? 'You' : 'Remy'}
                                      </span>
                                      <span className="text-xs text-stone-600">
                                        {formatTime(msg.timestamp)}
                                      </span>
                                    </div>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Continue conversation */}
                              <div className="mt-4">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/remy?conversation=${conv.id}`)
                                  }}
                                  className="w-full sm:w-auto"
                                >
                                  Continue this conversation
                                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
