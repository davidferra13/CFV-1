'use client'

import { useState, useCallback, useRef, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  getConversations,
  searchConversations,
  toggleConversationPin,
  toggleConversationArchive,
  deleteConversation,
} from '@/lib/remy/actions'
import type { ConversationWithPreview, RemyConversation } from '@/lib/remy/types'
import {
  Search,
  Pin,
  Archive,
  Trash2,
  MoreHorizontal,
  MessageSquare,
  X,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'

// ---- Types ----------------------------------------------------------------

type FilterTab = 'all' | 'pinned' | 'archived'

type SearchResult = {
  conversation: RemyConversation
  matching_message: string
  message_created_at: string
}

// ---- Helpers ---------------------------------------------------------------

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return 'This Week'
  if (days < 30) return 'This Month'
  return 'Earlier'
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function groupByDate<T>(items: T[], getDate: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  const order = ['Today', 'Yesterday', 'This Week', 'This Month', 'Earlier']
  for (const label of order) {
    groups.set(label, [])
  }
  for (const item of items) {
    const group = getDateGroup(getDate(item))
    const list = groups.get(group) || []
    list.push(item)
    groups.set(group, list)
  }
  // Remove empty groups
  for (const [key, val] of groups) {
    if (val.length === 0) groups.delete(key)
  }
  return groups
}

function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text
  // Simple highlight: wrap first match in markers (rendered via dangerouslySetInnerHTML)
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + query.length)
  const after = text.slice(idx + query.length)
  return `${escapeHtml(before)}<mark class="bg-brand-500/30 text-brand-300 rounded px-0.5">${escapeHtml(match)}</mark>${escapeHtml(after)}`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ---- Component -------------------------------------------------------------

export function RemyHistoryClient({
  initialConversations,
}: {
  initialConversations: ConversationWithPreview[]
}) {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- Search ----

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchConversations(value.trim())
        setSearchResults(results)
      } catch {
        toast.error('Search failed')
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults(null)
    setIsSearching(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  // ---- Mutations ----

  const refreshConversations = useCallback(async (tab: FilterTab) => {
    try {
      const fresh = await getConversations({ archived: tab === 'archived' })
      setConversations(fresh)
    } catch {
      toast.error('Failed to refresh conversations')
    }
  }, [])

  const handlePin = useCallback(
    (id: string) => {
      setOpenMenuId(null)
      const prev = conversations
      // Optimistic: toggle pinned
      setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))
      startTransition(async () => {
        try {
          await toggleConversationPin(id)
          await refreshConversations(activeTab)
        } catch {
          setConversations(prev)
          toast.error('Failed to update pin')
        }
      })
    },
    [conversations, activeTab, refreshConversations]
  )

  const handleArchive = useCallback(
    (id: string) => {
      setOpenMenuId(null)
      const prev = conversations
      // Optimistic: remove from current view
      setConversations((cs) => cs.filter((c) => c.id !== id))
      startTransition(async () => {
        try {
          const newArchived = await toggleConversationArchive(id)
          toast.success(newArchived ? 'Conversation archived' : 'Conversation unarchived')
          await refreshConversations(activeTab)
        } catch {
          setConversations(prev)
          toast.error('Failed to archive conversation')
        }
      })
    },
    [conversations, activeTab, refreshConversations]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    setOpenMenuId(null)
    const prev = conversations
    setConversations((cs) => cs.filter((c) => c.id !== id))
    try {
      await deleteConversation(id)
      toast.success('Conversation deleted')
    } catch {
      setConversations(prev)
      toast.error('Failed to delete conversation')
    }
  }, [deleteTarget, conversations])

  const handleTabChange = useCallback(
    (tab: FilterTab) => {
      setActiveTab(tab)
      clearSearch()
      startTransition(async () => {
        await refreshConversations(tab)
      })
    },
    [clearSearch, refreshConversations]
  )

  // ---- Filtered list ----

  const filtered = activeTab === 'pinned' ? conversations.filter((c) => c.pinned) : conversations

  const grouped = groupByDate(filtered, (c) => c.updated_at)

  // ---- Empty states ----

  function emptyMessage(): string {
    if (searchResults !== null && searchResults.length === 0) {
      return 'No conversations match your search'
    }
    if (activeTab === 'pinned' && filtered.length === 0) {
      return 'Pin important conversations to find them quickly'
    }
    if (activeTab === 'archived' && conversations.length === 0) {
      return 'No archived conversations'
    }
    if (conversations.length === 0) {
      return 'Start a conversation with Remy to see your history here'
    }
    return ''
  }

  // ---- Render ----

  const showEmpty =
    (searchResults !== null && searchResults.length === 0) ||
    (searchResults === null && filtered.length === 0)

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search conversations..."
          className="w-full rounded-lg border border-stone-700 bg-stone-800 pl-10 pr-10 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      {!searchResults && (
        <div className="flex gap-1 border-b border-stone-800 pb-1">
          {(['all', 'pinned', 'archived'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-3 py-1.5 text-sm rounded-t-md transition-colors ${
                activeTab === tab
                  ? 'text-brand-400 border-b-2 border-brand-500 font-medium'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'pinned' ? 'Pinned' : 'Archived'}
            </button>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {isSearching && <p className="text-sm text-stone-500 py-2">Searching...</p>}

      {/* Search results */}
      {searchResults && !isSearching && searchResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-stone-500 uppercase tracking-wide">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </p>
          {searchResults.map((result, i) => (
            <Link
              key={`${result.conversation.id}-${i}`}
              href={`/remy?id=${result.conversation.id}`}
              className="block rounded-xl border border-stone-800 bg-stone-800/50 p-4 hover:bg-stone-800 hover:border-stone-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium text-stone-100 truncate">
                  {result.conversation.title}
                </h3>
                <span className="text-xs text-stone-500 ml-2 shrink-0">
                  {formatTimestamp(result.message_created_at)}
                </span>
              </div>
              <p
                className="text-xs text-stone-400 line-clamp-2"
                dangerouslySetInnerHTML={{
                  __html: highlightMatch(result.matching_message, searchQuery),
                }}
              />
            </Link>
          ))}
        </div>
      )}

      {/* Empty state */}
      {showEmpty && !isSearching && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-stone-800 mb-4">
            <MessageSquare className="h-6 w-6 text-stone-500" />
          </div>
          <p className="text-sm text-stone-400">{emptyMessage()}</p>
          {conversations.length === 0 && activeTab === 'all' && !searchResults && (
            <Link href="/remy">
              <Button variant="primary" size="sm" className="mt-4">
                Start a conversation
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Grouped conversation list */}
      {!searchResults && !showEmpty && (
        <div className="space-y-6">
          {[...grouped.entries()].map(([group, items]) => (
            <div key={group}>
              <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                {group}
              </h2>
              <div className="space-y-2">
                {items.map((convo) => (
                  <ConversationCard
                    key={convo.id}
                    conversation={convo}
                    isMenuOpen={openMenuId === convo.id}
                    onToggleMenu={() => setOpenMenuId(openMenuId === convo.id ? null : convo.id)}
                    onPin={() => handlePin(convo.id)}
                    onArchive={() => handleArchive(convo.id)}
                    onDelete={() => setDeleteTarget(convo.id)}
                    activeTab={activeTab}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete conversation"
        description="This will permanently delete this conversation and all its messages. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ---- ConversationCard ------------------------------------------------------

function ConversationCard({
  conversation,
  isMenuOpen,
  onToggleMenu,
  onPin,
  onArchive,
  onDelete,
  activeTab,
}: {
  conversation: ConversationWithPreview
  isMenuOpen: boolean
  onToggleMenu: () => void
  onPin: () => void
  onArchive: () => void
  onDelete: () => void
  activeTab: FilterTab
}) {
  return (
    <div className="group relative rounded-xl border border-stone-800 bg-stone-800/50 hover:bg-stone-800 hover:border-stone-700 transition-colors">
      <Link href={`/remy?id=${conversation.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {conversation.pinned && (
              <Pin className="h-3.5 w-3.5 text-brand-400 shrink-0 fill-brand-400" />
            )}
            <h3 className="text-sm font-medium text-stone-100 truncate">{conversation.title}</h3>
          </div>
          <span className="text-xs text-stone-500 shrink-0 mt-0.5">
            {formatTimestamp(conversation.updated_at)}
          </span>
        </div>

        {conversation.last_message_preview && (
          <p className="text-xs text-stone-400 mt-1.5 line-clamp-2">
            {conversation.last_message_preview}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2">
          <Badge variant="default" className="text-xs">
            <MessageSquare className="h-3 w-3 mr-1" />
            {conversation.message_count}
          </Badge>
        </div>
      </Link>

      {/* Context menu trigger */}
      <div className="absolute top-3 right-12">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleMenu()
          }}
          className="p-1 rounded-md text-stone-500 hover:text-stone-300 hover:bg-stone-700 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {isMenuOpen && (
          <>
            {/* Backdrop to close menu */}
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleMenu()
              }}
            />
            <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-stone-700 bg-stone-800 shadow-xl py-1">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onPin()
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100"
              >
                <Pin className="h-3.5 w-3.5" />
                {conversation.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onArchive()
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100"
              >
                <Archive className="h-3.5 w-3.5" />
                {activeTab === 'archived' ? 'Unarchive' : 'Archive'}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDelete()
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-stone-700 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
