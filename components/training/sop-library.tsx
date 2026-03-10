'use client'

import { useState, useTransition } from 'react'
import { createSOP, deleteSOP, type SOP } from '@/lib/training/sop-actions'
import { SOP_CATEGORY_LABELS, type SOPCategory } from '@/lib/training/sop-shared'

const CATEGORIES: SOPCategory[] = [
  'food_safety',
  'opening_closing',
  'recipes',
  'equipment',
  'customer_service',
  'cleaning',
  'emergency',
  'general',
]

const ROLES = [
  { value: 'cook', label: 'Cook' },
  { value: 'server', label: 'Server' },
  { value: 'manager', label: 'Manager' },
  { value: 'driver', label: 'Driver' },
  { value: 'all', label: 'All Staff' },
]

const CATEGORY_COLORS: Record<SOPCategory, string> = {
  food_safety: 'bg-red-500/20 text-red-300',
  opening_closing: 'bg-blue-500/20 text-blue-300',
  recipes: 'bg-green-500/20 text-green-300',
  equipment: 'bg-orange-500/20 text-orange-300',
  customer_service: 'bg-purple-500/20 text-purple-300',
  cleaning: 'bg-teal-500/20 text-teal-300',
  emergency: 'bg-yellow-500/20 text-yellow-300',
  general: 'bg-zinc-500/20 text-zinc-300',
}

type Props = {
  initialSOPs: SOP[]
  onViewSOP: (sop: SOP) => void
}

export function SOPLibrary({ initialSOPs, onViewSOP }: Props) {
  const [sops, setSOPs] = useState<SOP[]>(initialSOPs)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<SOPCategory | ''>('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<SOPCategory>('general')
  const [content, setContent] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  const filtered = sops.filter((sop) => {
    if (filterCategory && sop.category !== filterCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return sop.title.toLowerCase().includes(q) || sop.content.toLowerCase().includes(q)
    }
    return true
  })

  // Group by category
  const grouped = filtered.reduce(
    (acc, sop) => {
      if (!acc[sop.category]) acc[sop.category] = []
      acc[sop.category].push(sop)
      return acc
    },
    {} as Record<string, SOP[]>
  )

  function handleCreate() {
    if (!title.trim() || !content.trim()) return
    setError(null)

    startTransition(async () => {
      try {
        const result = await createSOP({
          title: title.trim(),
          category,
          content: content.trim(),
          required_for_roles: selectedRoles.length > 0 ? selectedRoles : undefined,
        })

        if (!result.success) {
          setError(result.error || 'Failed to create SOP')
          return
        }

        if (result.sop) {
          setSOPs((prev) => [...prev, result.sop!])
        }

        setTitle('')
        setCategory('general')
        setContent('')
        setSelectedRoles([])
        setShowCreate(false)
      } catch {
        setError('Failed to create SOP')
      }
    })
  }

  function handleDelete(sopId: string) {
    if (!confirm('Delete this SOP? This will also remove all completion records.')) return
    setError(null)

    const previous = [...sops]
    setSOPs((prev) => prev.filter((s) => s.id !== sopId))

    startTransition(async () => {
      try {
        const result = await deleteSOP(sopId)
        if (!result.success) {
          setSOPs(previous)
          setError(result.error || 'Failed to delete SOP')
        }
      } catch {
        setSOPs(previous)
        setError('Failed to delete SOP')
      }
    })
  }

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search SOPs..."
          className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white w-64"
        />

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as SOPCategory | '')}
          className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {SOP_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto rounded-md bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-500"
        >
          + Create SOP
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <h3 className="text-sm font-medium text-white">New SOP</h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Kitchen Opening Checklist"
                className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SOPCategory)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {SOP_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Content (Markdown supported)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Write SOP content here. Markdown formatting is supported."
              className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Required for Roles</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  onClick={() => toggleRole(role.value)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    selectedRoles.includes(role.value)
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-zinc-600 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!title.trim() || !content.trim() || isPending}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create SOP'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-md bg-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SOP List grouped by category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">
          {search || filterCategory
            ? 'No SOPs match your filters'
            : 'No SOPs yet. Create your first standard operating procedure.'}
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catSOPs]) => (
          <div key={cat} className="space-y-2">
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              {SOP_CATEGORY_LABELS[cat as SOPCategory] || cat}
            </h3>
            <div className="space-y-2">
              {catSOPs.map((sop) => (
                <div
                  key={sop.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex-1 cursor-pointer" onClick={() => onViewSOP(sop)}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{sop.title}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          CATEGORY_COLORS[sop.category as SOPCategory] ||
                          'bg-zinc-500/20 text-zinc-300'
                        }`}
                      >
                        {SOP_CATEGORY_LABELS[sop.category as SOPCategory]}
                      </span>
                      <span className="text-[10px] text-zinc-500">v{sop.version}</span>
                    </div>
                    {sop.required_for_roles && sop.required_for_roles.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {sop.required_for_roles.map((role) => (
                          <span
                            key={role}
                            className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(sop.id)}
                    className="rounded px-2 py-1 text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
