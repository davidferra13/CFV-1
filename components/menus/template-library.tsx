'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getMenuTemplates,
  deleteMenuTemplate,
  createMenuFromTemplate,
  type MenuTemplate,
  type TemplateSeason,
} from '@/lib/menus/template-actions'

const SEASON_TABS: { label: string; value: TemplateSeason | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Spring', value: 'spring' },
  { label: 'Summer', value: 'summer' },
  { label: 'Fall', value: 'fall' },
  { label: 'Winter', value: 'winter' },
]

const SEASON_COLORS: Record<TemplateSeason, string> = {
  spring: 'bg-green-100 text-green-800',
  summer: 'bg-yellow-100 text-yellow-800',
  fall: 'bg-orange-100 text-orange-800',
  winter: 'bg-blue-100 text-blue-800',
  all_season: 'bg-gray-100 text-gray-800',
}

const SEASON_LABELS: Record<TemplateSeason, string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
  all_season: 'All Season',
}

interface TemplateLibraryProps {
  eventId?: string
}

export function TemplateLibrary({ eventId }: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<MenuTemplate[]>([])
  const [activeSeason, setActiveSeason] = useState<TemplateSeason | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setFetchError(null)
      try {
        const season = activeSeason === 'all' ? undefined : activeSeason
        const data = await getMenuTemplates(season)
        if (!cancelled) setTemplates(data)
      } catch (err) {
        if (!cancelled) setFetchError('Failed to load templates')
        console.error('[template-library]', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [activeSeason])

  function handleUseTemplate(templateId: string) {
    startTransition(async () => {
      try {
        const result = await createMenuFromTemplate(templateId, eventId)
        if (result.success) {
          toast.success('Menu created from template')
          router.push(`/menus/${result.data.id}`)
        }
      } catch (err) {
        toast.error('Failed to create menu from template')
        console.error('[template-library]', err)
      }
    })
  }

  function handleDelete(templateId: string) {
    const previous = templates
    setTemplates(templates.filter((t) => t.id !== templateId))

    startTransition(async () => {
      try {
        await deleteMenuTemplate(templateId)
        toast.success('Template deleted')
      } catch (err) {
        setTemplates(previous)
        toast.error('Failed to delete template')
        console.error('[template-library]', err)
      }
    })
  }

  // Group templates by season for display
  const grouped: Record<string, MenuTemplate[]> = {}
  for (const t of templates) {
    const key = t.season
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(t)
  }

  return (
    <div className="space-y-6">
      {/* Season filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {SEASON_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveSeason(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSeason === tab.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && <div className="text-center py-12 text-gray-500">Loading templates...</div>}

      {/* Error state */}
      {fetchError && !loading && <div className="text-center py-12 text-red-600">{fetchError}</div>}

      {/* Empty state */}
      {!loading && !fetchError && templates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium mb-2">No templates yet</p>
          <p className="text-sm">
            Save a menu as a template to start building your seasonal library.
          </p>
        </div>
      )}

      {/* Template grid */}
      {!loading && !fetchError && templates.length > 0 && (
        <div className="space-y-8">
          {Object.entries(grouped).map(([season, seasonTemplates]) => (
            <div key={season}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {SEASON_LABELS[season as TemplateSeason]}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {seasonTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={() => handleUseTemplate(template.id)}
                    onDelete={() => handleDelete(template.id)}
                    isPending={isPending}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// Template Card
// ============================================

interface TemplateCardProps {
  template: MenuTemplate
  onUse: () => void
  onDelete: () => void
  isPending: boolean
}

function TemplateCard({ template, onUse, onDelete, isPending }: TemplateCardProps) {
  const dishes = Array.isArray(template.dishes) ? template.dishes : []
  const dishCount = dishes.length
  const componentCount = dishes.reduce(
    (sum, d) => sum + (Array.isArray(d.components) ? d.components.length : 0),
    0
  )

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 text-sm leading-tight">{template.name}</h4>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            SEASON_COLORS[template.season]
          }`}
        >
          {SEASON_LABELS[template.season]}
          {template.week_number ? ` W${template.week_number}` : ''}
        </span>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{template.description}</p>
      )}

      {/* Stats */}
      <div className="flex gap-3 text-xs text-gray-500 mb-3">
        <span>
          {dishCount} {dishCount === 1 ? 'course' : 'courses'}
        </span>
        <span>
          {componentCount} {componentCount === 1 ? 'component' : 'components'}
        </span>
        <span>Used {template.times_used}x</span>
      </div>

      {/* Tags */}
      {template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.map((tag) => (
            <Badge key={tag} variant="default">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="primary" onClick={onUse} disabled={isPending} className="flex-1 text-xs">
          Use Template
        </Button>
        <Button
          variant="ghost"
          onClick={onDelete}
          disabled={isPending}
          className="text-xs text-red-600 hover:text-red-700"
        >
          Delete
        </Button>
      </div>
    </div>
  )
}
