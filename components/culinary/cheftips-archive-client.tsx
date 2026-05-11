'use client'

import { useState, useTransition, useCallback } from 'react'
import { Lightbulb, Plus, Search, Trash2, Edit2, X, Check } from '@/components/ui/icons'
import {
  addChefTip,
  deleteChefTip,
  updateChefTip,
  getChefTips,
} from '@/lib/chef/knowledge/tip-actions'
import type { ChefTip, ChefTipCategory } from '@/lib/chef/knowledge/tip-types'
import { toast } from 'sonner'

const PAGE_SIZE = 30

type Props = {
  initialTips: ChefTip[]
  initialTotal: number
  categories: { value: ChefTipCategory; label: string }[]
}

export function ChefTipsArchiveClient({ initialTips, initialTotal, categories }: Props) {
  const [tips, setTips] = useState(initialTips)
  const [total, setTotal] = useState(initialTotal)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [activeTag, setActiveTag] = useState<string>('')
  const [sortDesc, setSortDesc] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<string>('other')
  const [newSource, setNewSource] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [offset, setOffset] = useState(0)

  const reload = useCallback(
    async (params?: { search?: string; category?: string; tag?: string; off?: number }) => {
      const s = params?.search ?? search
      const c = params?.category ?? activeCategory
      const t = params?.tag ?? activeTag
      const o = params?.off ?? 0

      startTransition(async () => {
        try {
          const result = await getChefTips({
            search: s || undefined,
            category: c || undefined,
            tag: t || undefined,
            limit: PAGE_SIZE,
            offset: o,
          })
          setTips(result.tips)
          setTotal(result.total)
          setOffset(o)
        } catch {
          toast.error('Failed to load tips')
        }
      })
    },
    [search, activeCategory, activeTag]
  )

  function handleSearch(q: string) {
    setSearch(q)
    reload({ search: q, off: 0 })
  }

  function handleCategoryFilter(cat: string) {
    const next = activeCategory === cat ? '' : cat
    setActiveCategory(next)
    reload({ category: next, off: 0 })
  }

  function handleTagFilter(tag: string) {
    const next = activeTag === tag ? '' : tag
    setActiveTag(next)
    reload({ tag: next, off: 0 })
  }

  function handleAdd() {
    const trimmed = newContent.trim()
    if (!trimmed) return

    startTransition(async () => {
      try {
        const result = await addChefTip(trimmed, newTags, {
          title: newTitle || undefined,
          category: newCategory,
          source: newSource || undefined,
        })
        if (result.success) {
          toast.success('Tip saved')
          setNewContent('')
          setNewTitle('')
          setNewCategory('other')
          setNewSource('')
          setNewTags([])
          setShowAddForm(false)
          reload({ off: 0 })
        } else {
          toast.error(result.error || 'Failed to save')
        }
      } catch {
        toast.error('Failed to save tip')
      }
    })
  }

  function handleUpdate(id: string) {
    const trimmed = editContent.trim()
    if (!trimmed) return

    startTransition(async () => {
      try {
        const result = await updateChefTip(id, trimmed, undefined, {
          title: editTitle || undefined,
        })
        if (result.success) {
          toast.success('Tip updated')
          setEditingId(null)
          reload()
        } else {
          toast.error(result.error || 'Failed to update')
        }
      } catch {
        toast.error('Failed to update tip')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        const result = await deleteChefTip(id)
        if (result.success) {
          toast.success('Tip deleted')
          reload()
        } else {
          toast.error(result.error || 'Failed to delete')
        }
      } catch {
        toast.error('Failed to delete tip')
      }
    })
  }

  function toggleNewTag(tag: string) {
    setNewTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    )
  }

  const hasMore = offset + PAGE_SIZE < total
  const hasPrev = offset > 0

  // Collect unique tags from visible tips for filter chips
  const allTags = Array.from(new Set(tips.flatMap((t) => t.tags))).sort()

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search tips by title or content..."
          className="w-full rounded-md border border-stone-700 bg-stone-800 py-2 pl-10 pr-3 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => handleCategoryFilter(cat.value)}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              activeCategory === cat.value
                ? 'bg-amber-700 text-amber-100'
                : 'bg-stone-800 text-stone-500 hover:text-stone-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tag filters (from visible tips) */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagFilter(tag)}
              className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${
                activeTag === tag
                  ? 'bg-amber-900/60 text-amber-300'
                  : 'bg-stone-800/60 text-stone-600 hover:text-stone-400'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Add new tip */}
      {showAddForm ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 space-y-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-700 focus:outline-none"
            maxLength={200}
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="What did you learn?"
            className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-700 focus:outline-none resize-none"
            rows={3}
            maxLength={2000}
            autoFocus
          />
          <div className="flex items-center gap-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-xs text-stone-300 focus:border-amber-700 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="Source (optional)"
              className="flex-1 rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-xs text-stone-300 placeholder:text-stone-600 focus:border-amber-700 focus:outline-none"
              maxLength={500}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleNewTag(cat.value)}
                className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${
                  newTags.includes(cat.value)
                    ? 'bg-amber-700 text-amber-100'
                    : 'bg-stone-800 text-stone-600 hover:text-stone-400'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewContent('')
                setNewTitle('')
                setNewTags([])
                setNewSource('')
              }}
              className="rounded-md px-3 py-1 text-xs text-stone-500 hover:text-stone-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending || !newContent.trim()}
              className="rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-amber-100 hover:bg-amber-600 disabled:opacity-40"
            >
              {isPending ? 'Saving...' : 'Save Tip'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center gap-2 rounded-md border border-dashed border-stone-700 px-3 py-2.5 text-sm text-stone-500 hover:border-amber-800 hover:text-amber-400 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add a new tip
        </button>
      )}

      {/* Results count */}
      <p className="text-xs text-stone-600">
        {total} {total === 1 ? 'tip' : 'tips'}
        {(search || activeCategory || activeTag) && ' matching filters'}
      </p>

      {/* Tips list */}
      <div className="space-y-2">
        {tips.map((tip) => (
          <div
            key={tip.id}
            className="group rounded-lg border border-stone-700/50 bg-stone-800/40 px-4 py-3"
          >
            {editingId === tip.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-700 focus:outline-none"
                  maxLength={200}
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-md border border-stone-700 bg-stone-900 px-2 py-1.5 text-sm text-stone-200 focus:border-amber-700 focus:outline-none resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1 text-stone-500 hover:text-stone-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate(tip.id)}
                    disabled={isPending}
                    className="p-1 text-amber-500 hover:text-amber-400"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {tip.title && (
                  <p className="text-sm font-medium text-stone-200 mb-1">{tip.title}</p>
                )}
                <p className="text-sm text-stone-300">{tip.content}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tip.category && tip.category !== 'other' && (
                      <span className="rounded-full bg-stone-700/50 px-2 py-0.5 text-[10px] text-stone-400">
                        {tip.category}
                      </span>
                    )}
                    {tip.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-amber-900/30 px-2 py-0.5 text-[10px] text-amber-400"
                      >
                        {tag}
                      </span>
                    ))}
                    {tip.source && (
                      <span className="text-[10px] text-stone-600 italic">via {tip.source}</span>
                    )}
                    <span className="text-[10px] text-stone-600">
                      {new Date(tip.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(tip.id)
                        setEditContent(tip.content)
                        setEditTitle(tip.title || '')
                      }}
                      className="p-1 text-stone-600 hover:text-stone-400"
                      title="Edit"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tip.id)}
                      className="p-1 text-stone-600 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {tips.length === 0 && (
          <div className="py-12 text-center">
            <Lightbulb className="mx-auto h-8 w-8 text-stone-700" />
            <p className="mt-2 text-sm text-stone-600">
              {search || activeCategory || activeTag
                ? 'No tips match your filters'
                : 'No tips yet. Start capturing what you learn.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {(hasPrev || hasMore) && (
        <div className="flex justify-center gap-3 pt-2">
          {hasPrev && (
            <button
              type="button"
              onClick={() => reload({ off: Math.max(0, offset - PAGE_SIZE) })}
              disabled={isPending}
              className="rounded-md bg-stone-800 px-3 py-1 text-xs text-stone-400 hover:text-stone-300 disabled:opacity-40"
            >
              Previous
            </button>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={() => reload({ off: offset + PAGE_SIZE })}
              disabled={isPending}
              className="rounded-md bg-stone-800 px-3 py-1 text-xs text-stone-400 hover:text-stone-300 disabled:opacity-40"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  )
}
