'use client'

// Task Template Form - Create or edit a task template
// Fields: name, description, category, and a dynamic item list

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  createTemplate,
  updateTemplate,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type TemplateItem,
  type TaskTemplate,
} from '@/lib/tasks/template-actions'
import { TEMPLATE_CATEGORIES } from '@/lib/tasks/template-constants'

type Props = {
  template?: TaskTemplate
  onDone?: () => void
}

const CATEGORY_OPTIONS = Object.entries(TEMPLATE_CATEGORIES).map(([value, label]) => ({
  value,
  label,
}))

function emptyItem(): TemplateItem {
  return { title: '', description: '', estimated_minutes: 0 }
}

export function TaskTemplateForm({ template, onDone }: Props) {
  const router = useRouter()
  const isEditing = !!template

  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [category, setCategory] = useState(template?.category ?? 'other')
  const [items, setItems] = useState<TemplateItem[]>(
    template?.items && template.items.length > 0 ? template.items : [emptyItem()]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateItem(index: number, field: keyof TemplateItem, value: string | number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    if (items.length <= 1) return // Keep at least one
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= items.length) return
    setItems((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[newIndex]
      copy[newIndex] = temp
      return copy
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Filter out empty items
    const validItems = items.filter((item) => item.title.trim().length > 0)
    if (validItems.length === 0) {
      setError('At least one item with a title is required')
      setSaving(false)
      return
    }

    try {
      if (isEditing) {
        const input: UpdateTemplateInput = {
          name,
          description: description || null,
          category: category as CreateTemplateInput['category'],
          items: validItems,
        }
        await updateTemplate(template!.id, input)
      } else {
        const input: CreateTemplateInput = {
          name,
          description: description || undefined,
          category: category as CreateTemplateInput['category'],
          items: validItems,
        }
        await createTemplate(input)
      }

      router.refresh()
      onDone?.()

      // Reset form if creating new
      if (!isEditing) {
        setName('')
        setDescription('')
        setCategory('other')
        setItems([emptyItem()])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <Input
          label="Template Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Pre-Service Checklist"
          required
        />
      </div>

      {/* Description */}
      <div>
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this template for?"
          rows={2}
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1.5">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Items */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-2">Template Items</label>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="rounded-lg border border-stone-700 bg-stone-800/50 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-400">Item {index + 1}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="px-1.5 py-0.5 text-xs text-stone-400 hover:text-stone-200 disabled:opacity-30"
                    title="Move up"
                  >
                    &#8593;
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === items.length - 1}
                    className="px-1.5 py-0.5 text-xs text-stone-400 hover:text-stone-200 disabled:opacity-30"
                    title="Move down"
                  >
                    &#8595;
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    className="px-1.5 py-0.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-30"
                    title="Remove item"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <Input
                value={item.title}
                onChange={(e) => updateItem(index, 'title', e.target.value)}
                placeholder="Task title"
              />

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    value={item.description ?? ''}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Description (optional)"
                    className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={item.estimated_minutes ?? ''}
                    onChange={(e) =>
                      updateItem(index, 'estimated_minutes', parseInt(e.target.value, 10) || 0)
                    }
                    placeholder="Min"
                    min={0}
                    className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="ghost" size="sm" onClick={addItem} className="mt-2">
          + Add Item
        </Button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
