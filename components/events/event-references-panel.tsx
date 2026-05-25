'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getEventReferences,
  createEventReference,
  deleteEventReference,
} from '@/lib/events/reference-actions'
import { Link, Image, File, Plus, Trash2 } from '@/components/ui/icons'

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'inspiration', label: 'Inspiration' },
  { value: 'venue', label: 'Venue' },
  { value: 'theme', label: 'Theme' },
  { value: 'brand_guidelines', label: 'Brand Guidelines' },
  { value: 'client_reference', label: 'Client Reference' },
  { value: 'menu_reference', label: 'Menu Reference' },
] as const

function refIcon(refType: string) {
  if (refType === 'image') return <Image className="h-4 w-4 text-stone-400" />
  if (refType === 'file') return <File className="h-4 w-4 text-stone-400" />
  return <Link className="h-4 w-4 text-stone-400" />
}

function categoryBadge(category: string) {
  const label = CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category
  return <span className="rounded bg-stone-700 px-1.5 py-0.5 text-xs text-stone-300">{label}</span>
}

export function EventReferencesPanel({ eventId }: { eventId: string }) {
  const [refs, setRefs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('general')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getEventReferences(eventId)
      .then((data) => {
        if (!cancelled) setRefs(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Failed to load references')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  function resetForm() {
    setTitle('')
    setUrl('')
    setCategory('general')
    setDescription('')
    setFormError(null)
  }

  function handleAdd() {
    if (!title.trim()) {
      setFormError('Title is required')
      return
    }

    setFormError(null)
    startTransition(async () => {
      try {
        const result = await createEventReference({
          event_id: eventId,
          ref_type: 'url',
          title: title.trim(),
          url: url.trim() || undefined,
          category: category as any,
          description: description.trim() || undefined,
          sort_order: refs.length,
        })
        if (result.success && result.reference) {
          setRefs((prev) => [...prev, result.reference])
          resetForm()
          setShowForm(false)
        }
      } catch (err: any) {
        setFormError(err.message ?? 'Failed to add reference')
      }
    })
  }

  function handleDelete(refId: string) {
    startTransition(async () => {
      try {
        await deleteEventReference(refId)
        setRefs((prev) => prev.filter((r) => r.id !== refId))
      } catch (err: any) {
        setError(err.message ?? 'Failed to delete reference')
      }
    })
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-stone-200">References</h3>
          {refs.length > 0 && (
            <span className="rounded-full bg-stone-700 px-2 py-0.5 text-xs text-stone-300">
              {refs.length}
            </span>
          )}
        </div>
        <span className="text-xs text-stone-500">{collapsed ? '+' : '-'}</span>
      </button>

      {!collapsed && (
        <div className="border-t border-stone-700 px-4 pb-4 pt-2">
          {loading && <div className="py-4 text-center text-sm text-stone-500">Loading...</div>}

          {error && (
            <div className="mb-2 rounded bg-red-900/30 px-3 py-2 text-sm text-red-300">{error}</div>
          )}

          {!loading && refs.length === 0 && !showForm && (
            <p className="py-3 text-center text-sm text-stone-500">
              Pin links, images, or files for this event
            </p>
          )}

          {/* Reference list */}
          {refs.length > 0 && (
            <ul className="mb-3 space-y-2">
              {refs.map((ref) => (
                <li
                  key={ref.id}
                  className="flex items-start justify-between gap-2 rounded bg-stone-900 px-3 py-2"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="mt-0.5">{refIcon(ref.ref_type)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {ref.ref_type === 'url' && ref.url ? (
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-400 hover:underline truncate"
                          >
                            {ref.title}
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-stone-200 truncate">
                            {ref.title}
                          </span>
                        )}
                        {categoryBadge(ref.category)}
                      </div>
                      {ref.description && (
                        <p className="mt-0.5 text-xs text-stone-400 line-clamp-2">
                          {ref.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(ref.id)}
                    disabled={isPending}
                    className="shrink-0 rounded p-1 text-stone-500 hover:bg-stone-700 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Inline add form */}
          {showForm && (
            <div className="mb-3 space-y-2 rounded border border-stone-600 bg-stone-900 p-3">
              <input
                type="text"
                placeholder="Title (required)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-500 focus:border-stone-500 focus:outline-none"
              />
              <input
                type="url"
                placeholder="URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-500 focus:border-stone-500 focus:outline-none"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-sm text-stone-200 focus:border-stone-500 focus:outline-none"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-sm text-stone-200 placeholder:text-stone-500 focus:border-stone-500 focus:outline-none resize-none"
              />
              {formError && <p className="text-xs text-red-400">{formError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={isPending}
                  className="rounded bg-stone-600 px-3 py-1.5 text-sm text-stone-200 hover:bg-stone-500 disabled:opacity-50"
                >
                  {isPending ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="rounded px-3 py-1.5 text-sm text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add button */}
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-stone-400 hover:bg-stone-700 hover:text-stone-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Reference
            </button>
          )}
        </div>
      )}
    </div>
  )
}
