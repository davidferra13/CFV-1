'use client'

import { useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  createPackingTemplate,
  updatePackingTemplate,
  type PackingTemplateItem,
  type PackingTemplate,
} from '@/lib/packing/template-actions'

// ── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  'Intimate Dinner',
  'Group Dinner',
  'Corporate',
  'Meal Prep',
  'Outdoor',
  'Custom',
] as const

const ITEM_CATEGORIES = [
  'Knives',
  'Cookware',
  'Utensils',
  'Serving',
  'Storage',
  'Linens',
  'Misc',
] as const

function emptyItem(): PackingTemplateItem {
  return { name: '', quantity: 1, category: 'Misc' }
}

// ── Props ────────────────────────────────────────────────────────────────────

type PackingTemplateEditorProps = {
  template?: PackingTemplate | null
  onSaved?: (id: string) => void
  onCancel?: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export function PackingTemplateEditor({
  template,
  onSaved,
  onCancel,
}: PackingTemplateEditorProps) {
  const isEditing = !!template

  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [eventType, setEventType] = useState(template?.event_type ?? '')
  const [isDefault, setIsDefault] = useState(template?.is_default ?? false)
  const [items, setItems] = useState<PackingTemplateItem[]>(
    template?.items?.length ? template.items : [emptyItem()]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addItem = useCallback(() => {
    setItems(prev => [...prev, emptyItem()])
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateItem = useCallback(
    (index: number, field: keyof PackingTemplateItem, value: string | number) => {
      setItems(prev =>
        prev.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      )
    },
    []
  )

  const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
    setItems(prev => {
      const next = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }, [])

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required')
      return
    }

    const validItems = items.filter(item => item.name.trim())
    if (validItems.length === 0) {
      setError('Add at least one item')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (isEditing && template) {
        const result = await updatePackingTemplate(template.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          items: validItems,
          event_type: eventType || undefined,
          is_default: isDefault,
        })
        if (!result.success) {
          setError(result.error ?? 'Failed to update template')
          return
        }
        onSaved?.(template.id)
      } else {
        const result = await createPackingTemplate({
          name: name.trim(),
          description: description.trim() || undefined,
          items: validItems,
          event_type: eventType || undefined,
          is_default: isDefault,
        })
        if (!result.success) {
          setError(result.error ?? 'Failed to create template')
          return
        }
        onSaved?.(result.id!)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error('[PackingTemplateEditor] save error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-900">
        {isEditing ? 'Edit Template' : 'New Packing Template'}
      </h2>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-stone-200 mb-1">
          Template Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Intimate Dinner for 2"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-stone-200 mb-1">
          Description (optional)
        </label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Brief note about when to use this template"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
      </div>

      {/* Event Type */}
      <div>
        <label className="block text-sm font-medium text-stone-200 mb-1">
          Event Type
        </label>
        <select
          value={eventType}
          onChange={e => setEventType(e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        >
          <option value="">No specific type</option>
          {EVENT_TYPES.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <p className="text-xs text-stone-400 mt-1">
          When this type matches an event, this template will be suggested automatically.
        </p>
      </div>

      {/* Default toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={e => setIsDefault(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
        />
        <span className="text-sm text-stone-200">
          Default template (shown first when loading templates)
        </span>
      </label>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-stone-200">Items</label>
          <Button variant="ghost" size="sm" onClick={addItem}>
            + Add Item
          </Button>
        </div>

        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-2 bg-stone-50 rounded-lg p-3 border border-stone-200"
            >
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 pt-1">
                <button
                  type="button"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="text-stone-400 hover:text-stone-600 disabled:opacity-30 text-xs leading-none"
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === items.length - 1}
                  className="text-stone-400 hover:text-stone-600 disabled:opacity-30 text-xs leading-none"
                  title="Move down"
                >
                  ▼
                </button>
              </div>

              {/* Fields */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_80px_120px] gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={e => updateItem(index, 'name', e.target.value)}
                  placeholder="Item name"
                  className="rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-500 focus:outline-none"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={e =>
                    updateItem(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                  }
                  min={1}
                  className="rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-500 focus:outline-none"
                  title="Quantity"
                />
                <select
                  value={item.category}
                  onChange={e => updateItem(index, 'category', e.target.value)}
                  className="rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-500 focus:outline-none"
                >
                  {ITEM_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <input
                type="text"
                value={item.notes ?? ''}
                onChange={e => updateItem(index, 'notes', e.target.value)}
                placeholder="Notes"
                className="hidden sm:block w-32 rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-500 focus:outline-none"
              />

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-stone-400 hover:text-red-500 pt-1.5 text-sm"
                title="Remove item"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <p className="text-sm text-stone-400 text-center py-4">
            No items yet. Click &quot;+ Add Item&quot; to start building your template.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </Card>
  )
}
