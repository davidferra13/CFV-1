'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Archive, Trash2, Send, ChefHat, Inbox, Filter, Tag, Clock } from '@/components/ui/icons'
import { toast } from 'sonner'
import {
  archiveCapture,
  deleteCapture,
  type Capture,
  type CaptureStatus,
  type CaptureTag,
} from '@/lib/capture/actions'
import { useRouter } from 'next/navigation'

const STATUS_TABS: { value: CaptureStatus | 'all'; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'sorted', label: 'Sorted' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
]

const TAG_LABELS: Record<CaptureTag, string> = {
  recipe: 'Recipe',
  'event-idea': 'Event Idea',
  'client-note': 'Client Note',
  'marketing-thought': 'Marketing',
  'prep-task': 'Prep Task',
  shopping: 'Shopping',
  'menu-idea': 'Menu Idea',
  business: 'Business',
}

const TAG_COLORS: Record<CaptureTag, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  recipe: 'success',
  'event-idea': 'info',
  'client-note': 'error',
  'marketing-thought': 'default',
  'prep-task': 'warning',
  shopping: 'default',
  'menu-idea': 'info',
  business: 'default',
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '...'
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString()
}

export function CaptureInbox({ initialCaptures }: { initialCaptures: Capture[] }) {
  const [captures, setCaptures] = useState(initialCaptures)
  const [statusFilter, setStatusFilter] = useState<CaptureStatus | 'all'>('inbox')
  const [tagFilter, setTagFilter] = useState<CaptureTag | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const filtered = captures.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (tagFilter && !c.tags.includes(tagFilter)) return false
    return true
  })

  // Collect all tags present in captures for filter pills
  const allTags = Array.from(new Set(captures.flatMap((c) => c.tags))) as CaptureTag[]

  function handleArchive(id: string) {
    const prev = captures
    setCaptures((cs) => cs.map((c) => (c.id === id ? { ...c, status: 'archived' as const } : c)))
    startTransition(async () => {
      try {
        await archiveCapture(id)
        toast.success('Capture archived')
      } catch {
        setCaptures(prev)
        toast.error('Failed to archive capture')
      }
    })
  }

  function handleDelete(id: string) {
    const prev = captures
    setCaptures((cs) => cs.filter((c) => c.id !== id))
    startTransition(async () => {
      try {
        await deleteCapture(id)
        toast.success('Capture deleted')
      } catch {
        setCaptures(prev)
        toast.error('Failed to delete capture')
      }
    })
  }

  if (captures.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500 dark:text-stone-400">
        <Inbox className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No captures yet. Use the tools above to capture your first idea.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Inbox className="w-5 h-5" />
          Capture Inbox
          {filtered.length > 0 && <Badge variant="default">{filtered.length}</Badge>}
        </h2>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <Filter className="w-4 h-4 text-stone-400" />
          {tagFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTagFilter(null)}
              className="text-xs"
            >
              Clear
            </Button>
          )}
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={tagFilter === tag ? 'info' : 'default'}
              className="cursor-pointer"
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
            >
              {TAG_LABELS[tag] ?? tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Capture cards */}
      {filtered.length === 0 ? (
        <p className="text-sm text-stone-500 dark:text-stone-400 py-4 text-center">
          No captures match this filter.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((capture) => (
            <Card key={capture.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-900 dark:text-stone-100 font-medium">
                      {truncate(capture.rawContent, 150)}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {capture.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={TAG_COLORS[tag as CaptureTag] ?? 'default'}
                          className="text-xs"
                        >
                          {TAG_LABELS[tag as CaptureTag] ?? tag}
                        </Badge>
                      ))}
                      <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(capture.createdAt)}
                      </span>
                      <Badge variant="default" className="text-xs">
                        {capture.captureType}
                      </Badge>
                    </div>
                    {capture.parsedItems.length > 0 && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                        {capture.parsedItems.length} parsed item
                        {capture.parsedItems.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/culinary/recipes')}
                      title="Create Recipe"
                    >
                      <ChefHat className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/content')}
                      title="Send to Content"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                    {capture.status !== 'archived' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(capture.id)}
                        disabled={pending}
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(capture.id)}
                      disabled={pending}
                      title="Delete"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
