// Plating Guides Library (Client Component)
// Handles search, filtering, create/edit state

'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PlatingGuideCard } from '@/components/recipes/plating-guide'
import { PlatingGuideEditor } from '@/components/recipes/plating-guide-editor'
import { deletePlatingGuide } from '@/lib/recipes/plating-actions'
import type { PlatingGuide } from '@/lib/recipes/plating-actions'

interface PlatingGuidesLibraryProps {
  initialGuides: PlatingGuide[]
}

type FilterMode = 'all' | 'linked' | 'standalone'

export function PlatingGuidesLibrary({ initialGuides }: PlatingGuidesLibraryProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [showEditor, setShowEditor] = useState(false)
  const [editingGuide, setEditingGuide] = useState<PlatingGuide | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let guides = initialGuides

    // Filter by linked/standalone
    if (filter === 'linked') {
      guides = guides.filter(g => g.recipe_id)
    } else if (filter === 'standalone') {
      guides = guides.filter(g => !g.recipe_id)
    }

    // Search by dish name
    if (search.trim()) {
      const q = search.toLowerCase()
      guides = guides.filter(g => g.dish_name.toLowerCase().includes(q))
    }

    return guides
  }, [initialGuides, filter, search])

  const handleEdit = (guide: PlatingGuide) => {
    setEditingGuide(guide)
    setShowEditor(true)
  }

  const handleDelete = (guide: PlatingGuide) => {
    if (!confirm(`Delete plating guide for "${guide.dish_name}"?`)) return
    setDeleteError(null)

    startTransition(async () => {
      try {
        await deletePlatingGuide(guide.id)
        router.refresh()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete'
        setDeleteError(message)
      }
    })
  }

  const handleSave = () => {
    setShowEditor(false)
    setEditingGuide(null)
    router.refresh()
  }

  const handleCancel = () => {
    setShowEditor(false)
    setEditingGuide(null)
  }

  if (showEditor) {
    return (
      <PlatingGuideEditor
        guide={editingGuide}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by dish name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as FilterMode)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="all">All Guides</option>
            <option value="linked">Linked to Recipe</option>
            <option value="standalone">Standalone</option>
          </select>
          <Button variant="primary" onClick={() => { setEditingGuide(null); setShowEditor(true) }}>
            + New Guide
          </Button>
        </div>
      </div>

      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {deleteError}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-stone-500 text-lg">
            {initialGuides.length === 0
              ? 'No plating guides yet. Create your first one to get started.'
              : 'No guides match your search.'}
          </p>
          {initialGuides.length === 0 && (
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => setShowEditor(true)}
            >
              Create First Plating Guide
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(guide => (
            <PlatingGuideCard
              key={guide.id}
              guide={guide}
              onEdit={() => handleEdit(guide)}
              onDelete={() => handleDelete(guide)}
            />
          ))}
        </div>
      )}

      {isPending && (
        <p className="text-sm text-stone-400 text-center">Updating...</p>
      )}
    </div>
  )
}
