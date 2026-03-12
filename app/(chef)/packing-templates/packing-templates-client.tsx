'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PackingTemplateEditor } from '@/components/packing/packing-template-editor'
import { deletePackingTemplate, type PackingTemplate } from '@/lib/packing/template-actions'
import { toast } from 'sonner'

type PackingTemplatesClientProps = {
  initialTemplates: PackingTemplate[]
}

// ── Category color helper ────────────────────────────────────────────────────

function categoryBadgeColor(category: string): string {
  switch (category) {
    case 'Knives':
      return 'bg-red-900/30 text-red-300'
    case 'Cookware':
      return 'bg-orange-900/30 text-orange-300'
    case 'Utensils':
      return 'bg-blue-900/30 text-blue-300'
    case 'Serving':
      return 'bg-purple-900/30 text-purple-300'
    case 'Storage':
      return 'bg-teal-900/30 text-teal-300'
    case 'Linens':
      return 'bg-pink-900/30 text-pink-300'
    default:
      return 'bg-stone-700 text-stone-300'
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function PackingTemplatesClient({ initialTemplates }: PackingTemplatesClientProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initialTemplates)
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PackingTemplate | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleSaved = () => {
    setShowEditor(false)
    setEditingTemplate(null)
    router.refresh()
  }

  const handleEdit = (template: PackingTemplate) => {
    setEditingTemplate(template)
    setShowEditor(true)
  }

  const handleDelete = (template: PackingTemplate) => {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return

    const previous = templates
    setTemplates((prev) => prev.filter((t) => t.id !== template.id))
    setDeleteError(null)

    startTransition(async () => {
      try {
        const result = await deletePackingTemplate(template.id)
        if (!result.success) {
          setTemplates(previous)
          const msg = result.error ?? 'Failed to delete template'
          setDeleteError(msg)
          toast.error(msg)
        }
      } catch {
        setTemplates(previous)
        setDeleteError('Failed to delete template')
        toast.error('Failed to delete template')
      }
    })
  }

  const handleCreateNew = () => {
    setEditingTemplate(null)
    setShowEditor(true)
  }

  // Show editor
  if (showEditor) {
    return (
      <PackingTemplateEditor
        template={editingTemplate}
        onSaved={handleSaved}
        onCancel={() => {
          setShowEditor(false)
          setEditingTemplate(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={handleCreateNew}>
          Create Template
        </Button>
      </div>

      {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

      {/* Template cards */}
      {templates.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-stone-500 text-sm">
            No packing templates yet. Create one to save time on future events.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((template) => {
            // Group items by category for display
            const categoryCounts: Record<string, number> = {}
            for (const item of template.items) {
              categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
            }

            return (
              <Card key={template.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-stone-100">{template.name}</h3>
                    {template.description && (
                      <p className="text-xs text-stone-500 mt-0.5">{template.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {template.is_default && (
                      <span className="text-xs bg-stone-900 text-white px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-stone-500">
                    {template.items.length} item{template.items.length !== 1 ? 's' : ''}
                  </span>
                  {template.event_type && (
                    <span className="text-xs bg-stone-700 text-stone-300 px-2 py-0.5 rounded-full">
                      {template.event_type}
                    </span>
                  )}
                </div>

                {/* Category breakdown */}
                <div className="flex flex-wrap gap-1">
                  {Object.entries(categoryCounts).map(([cat, count]) => (
                    <span
                      key={cat}
                      className={`text-xs px-2 py-0.5 rounded-full ${categoryBadgeColor(cat)}`}
                    >
                      {cat}: {count}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(template)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template)}
                    disabled={isPending}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
