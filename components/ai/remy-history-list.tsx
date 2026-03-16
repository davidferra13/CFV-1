'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bot,
  Pin,
  PinOff,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ClipboardList,
  FileText,
  Search,
  Filter,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  listRemyArtifacts,
  toggleArtifactPin,
  deleteRemyArtifact,
} from '@/lib/ai/remy-artifact-actions'
import type { RemyArtifact } from '@/lib/ai/remy-artifact-actions'
import { toast } from 'sonner'

const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  conversation: 'Conversation',
  task_result: 'Task Result',
  email_draft: 'Email Draft',
  note: 'Note',
  financial_report: 'Financial Report',
  client_lookup: 'Client Lookup',
  event_summary: 'Event Summary',
  recipe_suggestion: 'Recipe Suggestion',
  schedule_check: 'Schedule Check',
}

const ARTIFACT_TYPE_ICONS: Record<string, typeof MessageCircle> = {
  conversation: MessageCircle,
  task_result: ClipboardList,
  email_draft: FileText,
  note: FileText,
}

const FILTER_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'conversation', label: 'Conversations' },
  { value: 'task_result', label: 'Task Results' },
  { value: 'email_draft', label: 'Email Drafts' },
  { value: 'note', label: 'Notes' },
]

export function RemyHistoryList() {
  const [artifacts, setArtifacts] = useState<RemyArtifact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const fetchArtifacts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listRemyArtifacts({
        type: typeFilter || undefined,
        pinnedOnly: pinnedOnly || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      setArtifacts(result.artifacts)
      setTotal(result.total)
    } catch {
      toast.error('Failed to load Remy history')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, pinnedOnly, page])

  useEffect(() => {
    fetchArtifacts()
  }, [fetchArtifacts])

  const handleTogglePin = useCallback(async (id: string, currentPinned: boolean) => {
    try {
      await toggleArtifactPin(id, !currentPinned)
      setArtifacts((prev) => prev.map((a) => (a.id === id ? { ...a, pinned: !currentPinned } : a)))
      toast.success(currentPinned ? 'Unpinned' : 'Pinned')
    } catch {
      toast.error('Failed to update')
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteRemyArtifact(id)
      setArtifacts((prev) => prev.filter((a) => a.id !== id))
      setTotal((prev) => prev - 1)
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }, [])

  // Client-side search filter
  const filtered = searchQuery
    ? artifacts.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.sourceMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : artifacts

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-stone-400" />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(0)
            }}
            className="text-sm rounded-lg border border-stone-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Pinned toggle */}
        <Button
          variant={pinnedOnly ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setPinnedOnly(!pinnedOnly)
            setPage(0)
          }}
        >
          <Pin className="h-3.5 w-3.5 mr-1" />
          Pinned
        </Button>
      </div>

      {/* Results count */}
      <p className="text-xs text-stone-500 dark:text-stone-400">
        {total} artifact{total !== 1 ? 's' : ''} total
        {typeFilter && ` (filtered by ${ARTIFACT_TYPE_LABELS[typeFilter] ?? typeFilter})`}
        {pinnedOnly && ' (pinned only)'}
      </p>

      {/* Artifact list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-stone-800 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="h-12 w-12 text-stone-300 dark:text-stone-400 mx-auto mb-3" />
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {total === 0
              ? 'Nothing here yet. Everything Remy creates is auto-saved - just start chatting!'
              : 'No matches found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((artifact) => {
            const Icon = ARTIFACT_TYPE_ICONS[artifact.artifactType] ?? FileText
            const isExpanded = expandedId === artifact.id

            return (
              <div
                key={artifact.id}
                className={`rounded-lg border transition-colors ${
                  artifact.pinned
                    ? 'border-brand-700 bg-brand-950/50 dark:border-brand-800 dark:bg-brand-950/30'
                    : 'border-stone-700 bg-stone-900 dark:border-stone-700 dark:bg-stone-900'
                }`}
              >
                {/* Card header */}
                <div className="flex items-start gap-3 p-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-stone-100 dark:text-stone-100 truncate">
                          {artifact.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="default">
                            {ARTIFACT_TYPE_LABELS[artifact.artifactType] ?? artifact.artifactType}
                          </Badge>
                          <span className="text-xs text-stone-400">
                            {formatDate(artifact.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleTogglePin(artifact.id, artifact.pinned)}
                          className={`p-1 rounded transition-colors ${
                            artifact.pinned
                              ? 'text-brand-600 hover:text-brand-400'
                              : 'text-stone-400 hover:text-stone-400 dark:text-stone-500 dark:hover:text-stone-300'
                          }`}
                          title={artifact.pinned ? 'Unpin' : 'Pin'}
                        >
                          {artifact.pinned ? (
                            <PinOff className="h-3.5 w-3.5" />
                          ) : (
                            <Pin className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(artifact.id)}
                          className="p-1 rounded text-stone-400 hover:text-red-600 dark:text-stone-500 dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Source message (what the chef asked) */}
                    {artifact.sourceMessage && (
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-1.5 truncate">
                        You asked: &ldquo;{artifact.sourceMessage}&rdquo;
                      </p>
                    )}

                    {/* Expand/collapse */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : artifact.id)}
                      className="flex items-center gap-1 mt-2 text-xs text-stone-500 hover:text-stone-300 dark:text-stone-400 dark:hover:text-stone-200"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {isExpanded ? 'Hide' : 'Show'} content
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-stone-800 dark:border-stone-800">
                    {artifact.content && (
                      <pre className="whitespace-pre-wrap font-sans text-sm text-stone-300 dark:text-stone-300 mt-3">
                        {artifact.content}
                      </pre>
                    )}
                    {!!artifact.data && !artifact.content && (
                      <pre className="whitespace-pre-wrap font-mono text-xs text-stone-500 mt-3 max-h-64 overflow-auto bg-stone-800 dark:bg-stone-800/50 rounded p-3">
                        {JSON.stringify(artifact.data, null, 2)}
                      </pre>
                    )}
                    {!!artifact.data && artifact.content && (
                      <details className="mt-2">
                        <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-400">
                          Raw data
                        </summary>
                        <pre className="whitespace-pre-wrap font-mono text-xs text-stone-500 mt-1 max-h-48 overflow-auto bg-stone-800 dark:bg-stone-800/50 rounded p-2">
                          {JSON.stringify(artifact.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-stone-500">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const date = new Date(iso)
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
