'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Clock,
  Download,
  Edit2,
  Lightbulb,
  Link2,
  Lock,
  Pin,
  Plus,
  Search,
  Trash2,
  Unlock,
  X,
} from '@/components/ui/icons'
import {
  addChefTip,
  deleteChefTip,
  updateChefTip,
  getChefTips,
  exportTipsAsMarkdown,
  pinChefTip,
  setChefTipReview,
  shareChefTip,
  promoteTipToNote,
} from '@/lib/chef/knowledge/tip-actions'
import type { ChefTip, ChefTipCategory } from '@/lib/chef/knowledge/tip-types'
import { KnowledgeLinkPicker } from '@/components/knowledge/knowledge-link-picker'
import { toast } from 'sonner'

const PAGE_SIZE = 30

type Props = {
  initialTips: ChefTip[]
  initialTotal: number
  categories: { value: ChefTipCategory; label: string }[]
  monthlyCounts: { month: string; count: number }[]
  topTags: { tag: string; count: number }[]
  onThisDayTips?: ChefTip[]
}

export function ChefTipsArchive({
  initialTips,
  initialTotal,
  categories,
  monthlyCounts,
  topTags,
  onThisDayTips,
}: Props) {
  const [tips, setTips] = useState(initialTips)
  const [total, setTotal] = useState(initialTotal)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [linkingId, setLinkingId] = useState<string | null>(null)

  const doSearch = useCallback(
    (searchVal?: string, tagVal?: string) => {
      startTransition(async () => {
        const result = await getChefTips({
          search: (searchVal ?? search) || undefined,
          tag: (tagVal ?? tagFilter) || undefined,
          limit: PAGE_SIZE,
        })
        setTips(result.tips)
        setTotal(result.total)
      })
    },
    [search, tagFilter]
  )

  function handleLoadMore() {
    setIsLoadingMore(true)
    startTransition(async () => {
      const result = await getChefTips({
        search: search || undefined,
        tag: tagFilter || undefined,
        limit: PAGE_SIZE,
        offset: tips.length,
      })
      setTips((prev) => [...prev, ...result.tips])
      setTotal(result.total)
      setIsLoadingMore(false)
    })
  }

  function handleAdd() {
    const trimmed = newContent.trim()
    if (!trimmed) return

    startTransition(async () => {
      try {
        const result = await addChefTip(trimmed, newTags)
        if (result.success) {
          setTips((prev) => [
            {
              id: result.id!,
              content: trimmed,
              tags: newTags,
              shared: false,
              pinned: false,
              review: false,
              promoted_to: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...prev,
          ])
          setTotal((prev) => prev + 1)
          setNewContent('')
          setNewTags([])
          setShowAdd(false)
          toast.success('Tip saved')
        } else {
          toast.error(result.error || 'Failed to save')
        }
      } catch {
        toast.error('Failed to save tip')
      }
    })
  }

  function startEdit(tip: ChefTip) {
    setEditingId(tip.id)
    setEditContent(tip.content)
    setEditTags([...tip.tags])
  }

  function handleUpdate() {
    if (!editingId) return
    const trimmed = editContent.trim()
    if (!trimmed) return

    startTransition(async () => {
      try {
        const result = await updateChefTip(editingId, trimmed, editTags)
        if (result.success) {
          setTips((prev) =>
            prev.map((t) =>
              t.id === editingId
                ? { ...t, content: trimmed, tags: editTags, updated_at: new Date().toISOString() }
                : t
            )
          )
          setEditingId(null)
          setEditContent('')
          setEditTags([])
          toast.success('Tip updated')
        } else {
          toast.error(result.error || 'Failed to update')
        }
      } catch {
        toast.error('Failed to update tip')
      }
    })
  }

  function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id)
      return
    }
    setConfirmDelete(null)
    startTransition(async () => {
      try {
        const result = await deleteChefTip(id)
        if (result.success) {
          setTips((prev) => prev.filter((t) => t.id !== id))
          setTotal((prev) => prev - 1)
          toast.success('Tip removed')
        } else {
          toast.error(result.error || 'Failed to delete')
        }
      } catch {
        toast.error('Failed to delete tip')
      }
    })
  }

  function handleTagClick(tag: string) {
    setTagFilter(tag)
    doSearch(search, tag)
  }

  function handleExport() {
    startTransition(async () => {
      try {
        const md = await exportTipsAsMarkdown()
        const blob = new Blob([md], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cheftips-${new Date().toISOString().split('T')[0]}.md`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Tips exported')
      } catch {
        toast.error('Export failed')
      }
    })
  }

  function handleTogglePin(tip: ChefTip) {
    const newPinned = !tip.pinned
    setTips((prev) => prev.map((t) => (t.id === tip.id ? { ...t, pinned: newPinned } : t)))
    startTransition(async () => {
      try {
        const result = await pinChefTip(tip.id, newPinned)
        if (!result.success) {
          setTips((prev) => prev.map((t) => (t.id === tip.id ? { ...t, pinned: !newPinned } : t)))
          toast.error(result.error || 'Failed')
        }
      } catch {
        setTips((prev) => prev.map((t) => (t.id === tip.id ? { ...t, pinned: !newPinned } : t)))
      }
    })
  }

  function handleToggleReview(tip: ChefTip) {
    const newReview = !tip.review
    setTips((prev) => prev.map((t) => (t.id === tip.id ? { ...t, review: newReview } : t)))
    startTransition(async () => {
      try {
        const result = await setChefTipReview(tip.id, newReview)
        if (!result.success) {
          setTips((prev) => prev.map((t) => (t.id === tip.id ? { ...t, review: !newReview } : t)))
          toast.error(result.error || 'Failed')
        }
      } catch {
        setTips((prev) => prev.map((t) => (t.id === tip.id ? { ...t, review: !newReview } : t)))
      }
    })
  }

  function handleToggleShare(tip: ChefTip) {
    const newShared = !tip.shared
    setTips((prev) => prev.map((t) => (t.id === tip.id ? { ...t, shared: newShared } : t)))
    startTransition(async () => {
      try {
        const result = await shareChefTip(tip.id, newShared)
        if (!result.success) {
          setTips((prev) => prev.map((t) => (t.id === tip.id ? { ...t, shared: !newShared } : t)))
          toast.error(result.error || 'Failed')
        } else {
          toast.success(newShared ? 'Tip shared' : 'Tip set to private')
        }
      } catch {
        setTips((prev) => prev.map((t) => (t.id === tip.id ? { ...t, shared: !newShared } : t)))
      }
    })
  }

  function handlePromote(tip: ChefTip) {
    if (tip.promoted_to) {
      toast.error('Already promoted to a note')
      return
    }
    startTransition(async () => {
      try {
        const result = await promoteTipToNote(tip.id)
        if (result.success) {
          setTips((prev) =>
            prev.map((t) => (t.id === tip.id ? { ...t, promoted_to: result.noteId! } : t))
          )
          toast.success('Tip promoted to note')
        } else {
          toast.error(result.error || 'Failed')
        }
      } catch {
        toast.error('Failed to promote tip')
      }
    })
  }

  const grouped = groupByDate(tips)
  const maxMonthly = Math.max(...monthlyCounts.map((m) => m.count), 1)
  const hasMore = total > tips.length

  return (
    <div className="space-y-6">
      {/* Monthly activity chart */}
      {monthlyCounts.some((m) => m.count > 0) && (
        <div className="rounded-lg border border-stone-700 bg-stone-800/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Learning Activity
            </p>
            {total > 0 && (
              <button
                type="button"
                onClick={handleExport}
                disabled={isPending}
                className="flex items-center gap-1 text-xs text-stone-600 hover:text-amber-400 transition-colors"
                title="Export all tips as Markdown"
              >
                <Download className="h-3 w-3" />
                Export
              </button>
            )}
          </div>
          <div className="flex items-end gap-1 h-16">
            {monthlyCounts.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-amber-700/60 transition-all min-h-[2px]"
                  style={{ height: `${Math.max((m.count / maxMonthly) * 100, 3)}%` }}
                  title={`${m.month}: ${m.count} tips`}
                />
                <span className="text-[10px] text-stone-600 truncate w-full text-center">
                  {m.month.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top tags quick filter */}
      {topTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topTags.map((t) => (
            <button
              key={t.tag}
              type="button"
              onClick={() => handleTagClick(t.tag)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                tagFilter === t.tag
                  ? 'bg-amber-700 text-amber-100'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
              }`}
            >
              {t.tag}
              <span className="ml-1 text-stone-600">{t.count}</span>
            </button>
          ))}
          {tagFilter && (
            <button
              type="button"
              onClick={() => {
                setTagFilter('')
                doSearch(search, '')
              }}
              className="rounded-full px-2 py-1 text-xs text-stone-500 hover:text-stone-400"
              title="Clear filter"
            >
              <X className="h-3 w-3 inline" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Search your tips..."
            className="w-full rounded-md border border-stone-700 bg-stone-800 py-2 pl-9 pr-3 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-700 focus:outline-none"
          />
        </div>
        <select
          value={tagFilter}
          onChange={(e) => {
            setTagFilter(e.target.value)
            doSearch(search, e.target.value)
          }}
          className="rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-400 focus:outline-none"
          title="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-amber-100 hover:bg-amber-600"
          title="Add tip"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* On this day (tips from same date in prior years) */}
      {onThisDayTips && onThisDayTips.length > 0 && (
        <div className="rounded-lg border border-amber-900/30 bg-amber-950/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600/70 mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            On this day
          </p>
          <div className="space-y-2">
            {onThisDayTips.map((tip) => (
              <div key={tip.id} className="flex items-start gap-2">
                <span className="shrink-0 text-xs text-amber-700 mt-0.5">
                  {new Date(tip.created_at).getFullYear()}
                </span>
                <p className="text-sm text-amber-300/80 italic">&ldquo;{tip.content}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new tip */}
      {showAdd && (
        <div className="rounded-lg border border-amber-900/40 bg-stone-800/80 p-4 space-y-3">
          <div className="relative">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What did you learn?"
              className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-700 focus:outline-none resize-none"
              rows={3}
              maxLength={2000}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
                if (e.key === 'Escape') {
                  setShowAdd(false)
                  setNewContent('')
                  setNewTags([])
                }
              }}
            />
            <span className="absolute bottom-2 right-2 text-[10px] text-stone-600">
              {newContent.length}/2000
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <MultiTagPicker categories={categories} selected={newTags} onChange={setNewTags} />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-stone-700 hidden sm:inline">Ctrl+Enter</span>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false)
                  setNewContent('')
                  setNewTags([])
                }}
                className="rounded-md px-3 py-1 text-xs text-stone-500 hover:text-stone-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={isPending || !newContent.trim()}
                className="rounded-md bg-amber-700 px-4 py-1 text-xs font-medium text-amber-100 hover:bg-amber-600 disabled:opacity-40"
              >
                {isPending ? 'Saving...' : 'Save Tip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tips list grouped by date */}
      {grouped.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-700 p-8 text-center">
          <Lightbulb className="mx-auto h-8 w-8 text-stone-600" />
          <p className="mt-2 text-sm text-stone-400">
            {search || tagFilter ? 'No tips match your search.' : 'No tips yet.'}
          </p>
          <p className="text-xs text-stone-600 mt-1">
            {search || tagFilter
              ? 'Try a different search or clear filters.'
              : 'Start capturing what you learn each day.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ date, label, items }) => (
            <div key={date}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                {label}
                <span className="ml-2 text-stone-700">
                  {items.length} {items.length === 1 ? 'tip' : 'tips'}
                </span>
              </h3>
              <div className="space-y-2">
                {items.map((tip) => (
                  <div
                    key={tip.id}
                    className="group rounded-lg border border-stone-700/50 bg-stone-800/40 px-4 py-3"
                  >
                    {editingId === tip.id ? (
                      <div className="space-y-2">
                        <EditTextarea
                          value={editContent}
                          onChange={setEditContent}
                          onSave={handleUpdate}
                          onCancel={() => {
                            setEditingId(null)
                            setEditContent('')
                            setEditTags([])
                          }}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <MultiTagPicker
                            categories={categories}
                            selected={editTags}
                            onChange={setEditTags}
                          />
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null)
                                setEditContent('')
                                setEditTags([])
                              }}
                              className="rounded-md px-2 py-1 text-xs text-stone-500 hover:text-stone-400"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleUpdate}
                              disabled={isPending || !editContent.trim()}
                              className="rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-amber-100 hover:bg-amber-600 disabled:opacity-40"
                              title="Save changes"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {tip.pinned && <Pin className="h-3 w-3 text-amber-500 shrink-0" />}
                              {tip.shared && <Unlock className="h-3 w-3 text-green-500 shrink-0" />}
                              {tip.promoted_to && (
                                <span className="text-[10px] text-blue-400 bg-blue-900/30 rounded px-1.5 py-0.5">
                                  promoted
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-stone-300 whitespace-pre-wrap">
                              {tip.content}
                            </p>
                          </div>
                          {/* Always visible on mobile, hover on desktop */}
                          <div className="shrink-0 flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleTogglePin(tip)}
                              className={`rounded p-1.5 transition-colors ${
                                tip.pinned
                                  ? 'text-amber-400'
                                  : 'text-stone-600 hover:text-amber-400'
                              }`}
                              title={tip.pinned ? 'Unpin' : 'Pin'}
                            >
                              <Pin className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleReview(tip)}
                              className={`rounded p-1.5 transition-colors ${
                                tip.review ? 'text-blue-400' : 'text-stone-600 hover:text-blue-400'
                              }`}
                              title={tip.review ? 'Remove from review' : 'Add to review'}
                            >
                              <Bookmark className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleShare(tip)}
                              className={`rounded p-1.5 transition-colors ${
                                tip.shared
                                  ? 'text-green-400'
                                  : 'text-stone-600 hover:text-green-400'
                              }`}
                              title={tip.shared ? 'Make private' : 'Share'}
                            >
                              {tip.shared ? (
                                <Unlock className="h-3.5 w-3.5" />
                              ) : (
                                <Lock className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setLinkingId(linkingId === tip.id ? null : tip.id)}
                              className={`rounded p-1.5 transition-colors ${
                                linkingId === tip.id
                                  ? 'text-cyan-400'
                                  : 'text-stone-600 hover:text-cyan-400'
                              }`}
                              title="Link to entity"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                            </button>
                            {!tip.promoted_to && (
                              <button
                                type="button"
                                onClick={() => handlePromote(tip)}
                                className="rounded p-1.5 text-stone-600 hover:text-purple-400 transition-colors"
                                title="Promote to note"
                              >
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEdit(tip)}
                              className="rounded p-1.5 text-stone-600 hover:text-amber-400"
                              title="Edit tip"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {confirmDelete === tip.id ? (
                              <button
                                type="button"
                                onClick={() => handleDelete(tip.id)}
                                className="rounded px-2 py-1 text-xs bg-red-900/60 text-red-300 hover:bg-red-800/60"
                                onBlur={() => setConfirmDelete(null)}
                              >
                                Delete?
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDelete(tip.id)}
                                className="rounded p-1.5 text-stone-600 hover:text-red-400"
                                title="Delete tip"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {tip.tags.map((tag) => (
                            <button
                              type="button"
                              key={tag}
                              onClick={() => handleTagClick(tag)}
                              className="rounded-full bg-amber-900/30 px-2 py-0.5 text-xs text-amber-400 hover:bg-amber-900/50 cursor-pointer transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                          <span className="text-xs text-stone-600 ml-auto">
                            {new Date(tip.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {linkingId === tip.id && (
                          <div className="mt-3">
                            <KnowledgeLinkPicker
                              sourceType="tip"
                              sourceId={tip.id}
                              onClose={() => setLinkingId(null)}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isPending || isLoadingMore}
            className="rounded-md border border-stone-700 bg-stone-800 px-4 py-2 text-sm text-stone-400 hover:bg-stone-700 hover:text-stone-300 disabled:opacity-40 transition-colors"
          >
            {isLoadingMore ? 'Loading...' : `Load more (${total - tips.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Edit Textarea ─────────────────────────────────────
function EditTextarea({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.focus()
      ref.current.selectionStart = ref.current.value.length
    }
  }, [])

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-amber-800 bg-stone-900 px-3 py-2 pr-16 text-sm text-stone-200 focus:border-amber-700 focus:outline-none resize-none"
        rows={2}
        maxLength={2000}
        placeholder="Edit your tip..."
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSave()
          if (e.key === 'Escape') onCancel()
        }}
      />
      <span className="absolute bottom-2 right-2 text-[10px] text-stone-600">
        {value.length}/2000
      </span>
    </div>
  )
}

// ─── Multi-Tag Picker ──────────────────────────────────
function MultiTagPicker({
  categories,
  selected,
  onChange,
}: {
  categories: { value: ChefTipCategory; label: string }[]
  selected: string[]
  onChange: (tags: string[]) => void
}) {
  function toggleTag(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag))
    } else if (selected.length < 5) {
      onChange([...selected, tag])
    }
  }

  return (
    <div className="flex flex-wrap gap-1 min-w-0">
      {categories.map((cat) => (
        <button
          key={cat.value}
          type="button"
          onClick={() => toggleTag(cat.value)}
          className={`rounded-full px-2 py-0.5 text-[11px] transition-colors ${
            selected.includes(cat.value)
              ? 'bg-amber-700 text-amber-100'
              : 'bg-stone-800 text-stone-500 hover:bg-stone-700 hover:text-stone-400'
          }`}
        >
          {cat.label}
        </button>
      ))}
      {selected.length >= 5 && (
        <span className="text-[10px] text-stone-600 self-center ml-1">max 5</span>
      )}
    </div>
  )
}

function groupByDate(tips: ChefTip[]): { date: string; label: string; items: ChefTip[] }[] {
  const groups: Map<string, ChefTip[]> = new Map()

  for (const tip of tips) {
    const date = new Date(tip.created_at).toISOString().split('T')[0]
    const existing = groups.get(date) ?? []
    existing.push(tip)
    groups.set(date, existing)
  }

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    label:
      date === today
        ? 'Today'
        : date === yesterday
          ? 'Yesterday'
          : new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            }),
    items,
  }))
}
