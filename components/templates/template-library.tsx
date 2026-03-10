'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Copy, Trash, Pencil, Search, Clock, Star, FileText } from '@/components/ui/icons'
import {
  getTemplates,
  updateTemplate,
  deleteTemplate,
  createFromTemplate,
  type EntityTemplate,
  type TemplateType,
} from '@/lib/templates/template-actions'

// ─── Constants ────────────────────────────────────────────────────

const TYPE_LABELS: Record<TemplateType, string> = {
  event: 'Events',
  bakery_order: 'Bakery Orders',
  wholesale_order: 'Wholesale',
  meal_plan: 'Meal Plans',
  production_batch: 'Production',
}

const TYPE_BADGE_VARIANT: Record<
  TemplateType,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  event: 'info',
  bakery_order: 'success',
  wholesale_order: 'warning',
  meal_plan: 'default',
  production_batch: 'error',
}

const ALL_TYPES: TemplateType[] = [
  'event',
  'bakery_order',
  'wholesale_order',
  'meal_plan',
  'production_batch',
]

// ─── Main Component ───────────────────────────────────────────────

export function TemplateLibrary({ initialTemplates }: { initialTemplates: EntityTemplate[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [templates, setTemplates] = useState(initialTemplates)
  const [filter, setFilter] = useState<TemplateType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const filtered = templates.filter((t) => {
    if (filter !== 'all' && t.template_type !== filter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        t.template_type.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Group by type
  const grouped: Record<string, EntityTemplate[]> = {}
  for (const t of filtered) {
    const group = t.template_type
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(t)
  }

  function handleStartEdit(template: EntityTemplate) {
    setEditingId(template.id)
    setEditName(template.name)
    setEditDescription(template.description || '')
  }

  function handleSaveEdit(templateId: string) {
    const previousTemplates = templates

    setTemplates(
      templates.map((t) =>
        t.id === templateId ? { ...t, name: editName, description: editDescription } : t
      )
    )
    setEditingId(null)

    startTransition(async () => {
      try {
        await updateTemplate(templateId, {
          name: editName,
          description: editDescription || undefined,
        })
        toast.success('Template updated')
        router.refresh()
      } catch (err: any) {
        setTemplates(previousTemplates)
        toast.error(err?.message || 'Failed to update template')
      }
    })
  }

  function handleDelete(template: EntityTemplate) {
    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return

    const previousTemplates = templates
    setTemplates(templates.filter((t) => t.id !== template.id))

    startTransition(async () => {
      try {
        await deleteTemplate(template.id)
        toast.success('Template deleted')
        router.refresh()
      } catch (err: any) {
        setTemplates(previousTemplates)
        toast.error(err?.message || 'Failed to delete template')
      }
    })
  }

  function handleUseTemplate(template: EntityTemplate) {
    startTransition(async () => {
      try {
        const result = await createFromTemplate(template.id)
        toast.success(`Template "${template.name}" loaded. Ready to create ${result.templateType}.`)

        // Update local use count
        setTemplates(
          templates.map((t) =>
            t.id === template.id
              ? { ...t, use_count: t.use_count + 1, last_used_at: new Date().toISOString() }
              : t
          )
        )
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to use template')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 text-sm"
            placeholder="Search templates..."
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button variant={filter === 'all' ? 'primary' : 'ghost'} onClick={() => setFilter('all')}>
            All
          </Button>
          {ALL_TYPES.map((type) => (
            <Button
              key={type}
              variant={filter === type ? 'primary' : 'ghost'}
              onClick={() => setFilter(type)}
            >
              {TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>

      {/* Template Groups */}
      {filtered.length === 0 ? (
        <Card className="bg-stone-900 border-stone-800">
          <CardContent className="py-12 text-center">
            <FileText size={40} className="mx-auto text-stone-600 mb-3" />
            <p className="text-stone-400">
              {searchQuery || filter !== 'all'
                ? 'No templates match your search.'
                : 'No templates yet. Save an event or order as a template to get started.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <Card key={type} className="bg-stone-900 border-stone-800">
            <CardHeader>
              <CardTitle className="text-stone-100 flex items-center gap-2">
                {TYPE_LABELS[type as TemplateType]}
                <Badge variant="default">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-start gap-4 p-4 bg-stone-800/50 rounded-lg border border-stone-700"
                  >
                    <div className="flex-1 min-w-0">
                      {editingId === template.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 bg-stone-900 border border-stone-600 rounded text-stone-100 text-sm"
                          />
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full px-2 py-1 bg-stone-900 border border-stone-600 rounded text-stone-100 text-sm"
                            placeholder="Description (optional)"
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              onClick={() => handleSaveEdit(template.id)}
                              disabled={pending}
                            >
                              Save
                            </Button>
                            <Button variant="ghost" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-stone-100">{template.name}</span>
                            <Badge
                              variant={TYPE_BADGE_VARIANT[template.template_type as TemplateType]}
                            >
                              {template.template_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          {template.description && (
                            <p className="text-sm text-stone-400 mb-2">{template.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-stone-500">
                            <span className="flex items-center gap-1">
                              <Star size={12} />
                              Used {template.use_count} time{template.use_count !== 1 ? 's' : ''}
                            </span>
                            {template.last_used_at && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                Last: {new Date(template.last_used_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {editingId !== template.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="primary"
                          onClick={() => handleUseTemplate(template)}
                          disabled={pending}
                          title="Use this template"
                        >
                          <Copy size={16} className="mr-1" />
                          Use
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleStartEdit(template)}
                          disabled={pending}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDelete(template)}
                          disabled={pending}
                          title="Delete"
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
