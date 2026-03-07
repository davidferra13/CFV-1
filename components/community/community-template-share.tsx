'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Globe } from '@/components/ui/icons'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { toast } from 'sonner'
import type { CommunityTemplateType } from '@/lib/community/template-sharing'
import { publishTemplate } from '@/lib/community/template-sharing'

type SourceItem = { id: string; name: string; meta?: string }

type Props = {
  menus: SourceItem[]
  recipes: SourceItem[]
  messageTemplates: SourceItem[]
  proposalTemplates: SourceItem[]
}

const TYPE_OPTIONS: { value: CommunityTemplateType; label: string }[] = [
  { value: 'menu', label: 'Menu' },
  { value: 'recipe', label: 'Recipe' },
  { value: 'message', label: 'Message Template' },
  { value: 'quote', label: 'Proposal Template' },
]

const CUISINE_OPTIONS = [
  'American',
  'Italian',
  'French',
  'Japanese',
  'Mexican',
  'Thai',
  'Indian',
  'Mediterranean',
  'Southern',
  'Fusion',
  'Plant-Based',
  'Other',
]

const OCCASION_OPTIONS = [
  'Dinner Party',
  'Wedding',
  'Corporate',
  'Holiday',
  'Birthday',
  'Brunch',
  'Cocktail Party',
  'Tasting Menu',
  'Family Meal',
  'Other',
]

export function CommunityTemplateShare({
  menus,
  recipes,
  messageTemplates,
  proposalTemplates,
}: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [templateType, setTemplateType] = useState<CommunityTemplateType>('menu')
  const [selectedId, setSelectedId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [occasionType, setOccasionType] = useState('')
  const [tags, setTags] = useState('')

  function getSourceItems(): SourceItem[] {
    switch (templateType) {
      case 'menu':
        return menus
      case 'recipe':
        return recipes
      case 'message':
        return messageTemplates
      case 'quote':
        return proposalTemplates
      default:
        return []
    }
  }

  function resetForm() {
    setTemplateType('menu')
    setSelectedId('')
    setTitle('')
    setDescription('')
    setCuisineType('')
    setOccasionType('')
    setTags('')
  }

  function handleSubmit() {
    if (!selectedId) {
      toast.error('Select a template to share')
      return
    }
    if (!title.trim()) {
      toast.error('Give your template a title')
      return
    }

    const sourceItems = getSourceItems()
    const source = sourceItems.find((s) => s.id === selectedId)

    startTransition(async () => {
      try {
        await publishTemplate({
          template_type: templateType,
          title: title.trim(),
          description: description.trim() || undefined,
          content: {
            source_id: selectedId,
            source_name: source?.name || title.trim(),
            shared_at: new Date().toISOString(),
          },
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          cuisine_type: cuisineType || undefined,
          occasion_type: occasionType || undefined,
        })
        toast.success('Template shared with the community!')
        resetForm()
        setOpen(false)
      } catch (err: any) {
        toast.error(err.message || 'Failed to share template')
      }
    })
  }

  const sourceItems = getSourceItems()

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Globe className="h-4 w-4 mr-2" />
        Share a Template
      </Button>

      <AccessibleDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Share a Template"
        description="Share one of your templates with the ChefFlow community. Client names and private data are never included."
        widthClassName="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={isPending}>
              Share with Community
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Template Type */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Type</label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setTemplateType(opt.value)
                    setSelectedId('')
                  }}
                  className="transition-colors"
                >
                  <Badge variant={templateType === opt.value ? 'info' : 'default'}>
                    {opt.label}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Source Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Select from your {templateType === 'quote' ? 'proposals' : `${templateType}s`}
            </label>
            {sourceItems.length === 0 ? (
              <p className="text-sm text-stone-500">
                No {templateType === 'quote' ? 'proposal templates' : `${templateType}s`} found.
                Create one first.
              </p>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value)
                  if (!title) {
                    const item = sourceItems.find((s) => s.id === e.target.value)
                    if (item) setTitle(item.name)
                  }
                }}
                className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
              >
                <option value="">Choose...</option>
                {sourceItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.meta ? ` (${item.meta})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Title (public)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Garden Party Menu"
              className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
              maxLength={120}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes this template useful? Any tips for other chefs?"
              rows={3}
              className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 outline-none resize-none focus:border-brand-500"
              maxLength={500}
            />
          </div>

          {/* Cuisine + Occasion */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">Cuisine</label>
              <select
                value={cuisineType}
                onChange={(e) => setCuisineType(e.target.value)}
                className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
              >
                <option value="">Any</option>
                {CUISINE_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">Occasion</label>
              <select
                value={occasionType}
                onChange={(e) => setOccasionType(e.target.value)}
                className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
              >
                <option value="">Any</option>
                {OCCASION_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. farm-to-table, gluten-free, quick"
              className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-brand-500"
            />
          </div>

          {/* Privacy notice */}
          <div className="rounded-md bg-stone-800/50 border border-stone-700 px-3 py-2.5">
            <p className="text-xs text-stone-400">
              Only the template structure is shared. Client names, pricing, and private notes are
              never included. Your name is not attached to shared templates.
            </p>
          </div>
        </div>
      </AccessibleDialog>
    </>
  )
}
