'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClause, deleteClause, updateClause } from '@/lib/contracts/clause-actions'
import type { ClauseCategory } from '@/lib/contracts/default-clauses'

type Clause = {
  id: string
  slug: string
  title: string
  body: string
  category: ClauseCategory
  is_default: boolean
  sort_order: number
}

type DraftClause = {
  id?: string
  slug: string
  title: string
  body: string
  category: ClauseCategory
  is_default: boolean
  sort_order: number
}

const CATEGORY_OPTIONS: { value: ClauseCategory; label: string }[] = [
  { value: 'scope', label: 'Scope' },
  { value: 'payment', label: 'Payment' },
  { value: 'cancellation', label: 'Cancellation' },
  { value: 'reschedule', label: 'Reschedule' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'liability', label: 'Liability' },
  { value: 'ip', label: 'Intellectual Property' },
  { value: 'confidentiality', label: 'Confidentiality' },
  { value: 'force_majeure', label: 'Force Majeure' },
  { value: 'dispute', label: 'Dispute' },
  { value: 'custom', label: 'Custom' },
]

const EMPTY_DRAFT: DraftClause = {
  slug: '',
  title: '',
  body: '',
  category: 'custom',
  is_default: false,
  sort_order: 0,
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getCategoryLabel(category: string) {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category
}

export function ClauseLibrary({ clauses }: { clauses: Clause[] }) {
  const router = useRouter()
  const [draft, setDraft] = useState<DraftClause>(EMPTY_DRAFT)
  const [activeCategory, setActiveCategory] = useState<ClauseCategory | 'all'>('all')
  const [isPending, startTransition] = useTransition()

  const visibleClauses = useMemo(() => {
    return clauses
      .filter((clause) => activeCategory === 'all' || clause.category === activeCategory)
      .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
  }, [activeCategory, clauses])

  const categoryCounts = useMemo(() => {
    const counts = new Map<ClauseCategory, number>()
    for (const clause of clauses) {
      counts.set(clause.category, (counts.get(clause.category) ?? 0) + 1)
    }
    return counts
  }, [clauses])

  const editing = Boolean(draft.id)

  function resetDraft() {
    setDraft(EMPTY_DRAFT)
  }

  function editClause(clause: Clause) {
    setDraft({
      id: clause.id,
      slug: clause.slug,
      title: clause.title,
      body: clause.body,
      category: clause.category,
      is_default: clause.is_default,
      sort_order: clause.sort_order,
    })
  }

  function updateTitle(title: string) {
    setDraft((current) => ({
      ...current,
      title,
      slug: current.id || current.slug ? current.slug : slugify(title),
    }))
  }

  function saveClause() {
    const payload = {
      slug: draft.slug.trim() || slugify(draft.title),
      title: draft.title.trim(),
      body: draft.body.trim(),
      category: draft.category,
      is_default: draft.is_default,
      sort_order: Number.isFinite(draft.sort_order) ? draft.sort_order : 0,
    }

    if (!payload.title || !payload.body || !payload.slug) {
      toast.error('Add a title and content before saving')
      return
    }

    startTransition(async () => {
      const result = draft.id
        ? await updateClause({ id: draft.id, ...payload })
        : await createClause(payload)

      if (!result.success) {
        toast.error(result.error || 'Could not save clause')
        return
      }

      toast.success(editing ? 'Clause updated' : 'Clause created')
      resetDraft()
      router.refresh()
    })
  }

  function removeClause(id: string) {
    startTransition(async () => {
      const result = await deleteClause(id)
      if (!result.success) {
        toast.error(result.error || 'Could not delete clause')
        return
      }

      toast.success('Clause deleted')
      if (draft.id === id) resetDraft()
      router.refresh()
    })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
              activeCategory === 'all'
                ? 'border-brand-500 bg-brand-500/10 text-brand-200'
                : 'border-stone-700 bg-stone-800/40 text-stone-300 hover:border-stone-600'
            }`}
          >
            All ({clauses.length})
          </button>
          {CATEGORY_OPTIONS.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => setActiveCategory(category.value)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                activeCategory === category.value
                  ? 'border-brand-500 bg-brand-500/10 text-brand-200'
                  : 'border-stone-700 bg-stone-800/40 text-stone-300 hover:border-stone-600'
              }`}
            >
              {category.label} ({categoryCounts.get(category.value) ?? 0})
            </button>
          ))}
        </div>

        {visibleClauses.length === 0 ? (
          <div className="rounded-lg border border-stone-700 bg-stone-800/30 p-8 text-center">
            <p className="font-medium text-stone-200">No clauses in this category</p>
            <p className="mt-1 text-sm text-stone-400">
              Create a clause or choose another category.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleClauses.map((clause) => (
              <article
                key={clause.id}
                className="rounded-lg border border-stone-700 bg-stone-800/30 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-stone-100">{clause.title}</h2>
                      <Badge variant="info">{getCategoryLabel(clause.category)}</Badge>
                      {clause.is_default && <Badge variant="success">Default</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-stone-500">{clause.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => editClause(clause)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeClause(clause.id)}
                      disabled={isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-stone-300">
                  {clause.body}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <aside className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-100">
            {editing ? 'Edit Clause' : 'New Clause'}
          </h2>
          {editing && (
            <button
              type="button"
              onClick={resetDraft}
              className="text-sm text-stone-400 hover:text-stone-200"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-stone-300">Title</span>
            <input
              value={draft.title}
              onChange={(event) => updateTitle(event.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-300">Slug</span>
            <input
              value={draft.slug}
              onChange={(event) =>
                setDraft((current) => ({ ...current, slug: slugify(event.target.value) }))
              }
              className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-stone-300">Category</span>
              <select
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    category: event.target.value as ClauseCategory,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-300">Sort</span>
              <input
                type="number"
                value={draft.sort_order}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, sort_order: Number(event.target.value) }))
                }
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2">
            <input
              type="checkbox"
              checked={draft.is_default}
              onChange={(event) =>
                setDraft((current) => ({ ...current, is_default: event.target.checked }))
              }
              className="h-4 w-4 rounded border-stone-600 bg-stone-900 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-stone-300">
              Include by default when composing contracts
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-300">Clause Body</span>
            <textarea
              value={draft.body}
              onChange={(event) =>
                setDraft((current) => ({ ...current, body: event.target.value }))
              }
              rows={12}
              className="mt-1 w-full resize-y rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm leading-6 text-stone-100 outline-none focus:border-brand-500"
            />
          </label>

          <Button variant="primary" className="w-full" onClick={saveClause} loading={isPending}>
            {editing ? 'Update Clause' : 'Create Clause'}
          </Button>
        </div>
      </aside>
    </div>
  )
}
