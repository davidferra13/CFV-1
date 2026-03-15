'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { saveMenuAsTemplate, type TemplateSeason } from '@/lib/menus/template-actions'

const SEASON_OPTIONS: { label: string; value: TemplateSeason }[] = [
  { label: 'Spring', value: 'spring' },
  { label: 'Summer', value: 'summer' },
  { label: 'Fall', value: 'fall' },
  { label: 'Winter', value: 'winter' },
  { label: 'All Season', value: 'all_season' },
]

interface SaveAsTemplateButtonProps {
  menuId: string
  menuName?: string
}

export function SaveAsTemplateButton({ menuId, menuName }: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false)
  const [season, setSeason] = useState<TemplateSeason>('all_season')
  const [weekNumber, setWeekNumber] = useState<number | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  function handleAddTag() {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
    }
    setTagInput('')
  }

  function handleRemoveTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const result = await saveMenuAsTemplate(menuId, season, weekNumber, tags)
        if (result.success) {
          toast.success('Menu saved as template')
          setOpen(false)
          setSeason('all_season')
          setWeekNumber(null)
          setTags([])
          setTagInput('')
        }
      } catch (err) {
        toast.error('Failed to save as template')
        console.error('[save-as-template]', err)
      }
    })
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Save as Template
      </Button>

      <AccessibleDialog
        open={open}
        title="Save Menu as Template"
        description={
          menuName
            ? `Create a reusable template from "${menuName}"`
            : 'Create a reusable template from this menu'
        }
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Season selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value as TemplateSeason)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {SEASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Week number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Week Number (optional, 1-4 for weekly rotation)
            </label>
            <select
              value={weekNumber ?? ''}
              onChange={(e) => setWeekNumber(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">No specific week</option>
              <option value="1">Week 1</option>
              <option value="2">Week 2</option>
              <option value="3">Week 3</option>
              <option value="4">Week 4</option>
            </select>
          </div>

          {/* Tags input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. vegetarian-friendly, budget"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <Button variant="secondary" onClick={handleAddTag} type="button">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-gray-400 hover:text-gray-600"
                      type="button"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </AccessibleDialog>
    </>
  )
}
