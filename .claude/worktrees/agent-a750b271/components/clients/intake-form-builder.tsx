// Intake Form Builder - Create and edit intake form field definitions
// Supports add/remove/reorder fields, field type selection, options editing

'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import type { IntakeForm, IntakeFormField, IntakeFieldType } from '@/lib/clients/intake-types'
import { MAPPABLE_CLIENT_FIELDS } from '@/lib/clients/intake-types'

interface Props {
  initialForm?: IntakeForm
  onSave: (name: string, description: string, fields: IntakeFormField[]) => void
  onCancel: () => void
  saving?: boolean
}

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox_group', label: 'Checkboxes (multiple)' },
  { value: 'radio', label: 'Radio (single choice)' },
  { value: 'select', label: 'Dropdown' },
  { value: 'allergy_picker', label: 'Allergy Picker' },
]

const MAPPED_FIELD_OPTIONS = [
  { value: '', label: 'None (custom field)' },
  ...Object.entries(MAPPABLE_CLIENT_FIELDS).map(([key, label]) => ({
    value: key,
    label,
  })),
]

function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function createEmptyField(): IntakeFormField {
  return {
    id: generateFieldId(),
    type: 'text',
    label: '',
    required: false,
  }
}

export function IntakeFormBuilder({ initialForm, onSave, onCancel, saving }: Props) {
  const [name, setName] = useState(initialForm?.name || '')
  const [description, setDescription] = useState(initialForm?.description || '')
  const [fields, setFields] = useState<IntakeFormField[]>(
    initialForm?.fields?.length ? initialForm.fields : [createEmptyField()]
  )
  const [expandedField, setExpandedField] = useState<string | null>(
    fields.length === 1 ? fields[0].id : null
  )

  function addField() {
    const newField = createEmptyField()
    setFields((prev) => [...prev, newField])
    setExpandedField(newField.id)
  }

  function removeField(fieldId: string) {
    setFields((prev) => prev.filter((f) => f.id !== fieldId))
    if (expandedField === fieldId) setExpandedField(null)
  }

  function updateField(fieldId: string, updates: Partial<IntakeFormField>) {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f
        const updated = { ...f, ...updates }
        // Clear options if switching to a type that doesn't use them
        if (updates.type && !['checkbox_group', 'radio', 'select'].includes(updates.type)) {
          delete updated.options
        }
        // Init options if switching to a type that needs them
        if (
          updates.type &&
          ['checkbox_group', 'radio', 'select'].includes(updates.type) &&
          !updated.options
        ) {
          updated.options = ['Option 1', 'Option 2']
        }
        return updated
      })
    )
  }

  function moveField(fieldId: string, direction: 'up' | 'down') {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === fieldId)
      if (idx < 0) return prev
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  function handleSubmit() {
    if (!name.trim()) return
    const validFields = fields.filter((f) => f.label.trim())
    if (validFields.length === 0) return
    onSave(name.trim(), description.trim(), validFields)
  }

  const needsOptions = (type: IntakeFieldType) =>
    ['checkbox_group', 'radio', 'select'].includes(type)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{initialForm ? 'Edit Form' : 'Create New Form'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Form Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., New Client Assessment"
            required
          />
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this form is for..."
            rows={2}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-700">Fields ({fields.length})</h3>
          <Button size="sm" variant="secondary" onClick={addField}>
            + Add Field
          </Button>
        </div>

        {fields.map((field, idx) => {
          const isExpanded = expandedField === field.id
          return (
            <Card key={field.id} className={isExpanded ? 'ring-2 ring-brand-200' : ''}>
              <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-stone-50"
                onClick={() => setExpandedField(isExpanded ? null : field.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-stone-400 font-mono w-5 shrink-0">{idx + 1}</span>
                  <span className="text-sm font-medium text-stone-900 truncate">
                    {field.label || '(untitled field)'}
                  </span>
                  <span className="text-xs text-stone-400">
                    {FIELD_TYPE_OPTIONS.find((t) => t.value === field.type)?.label || field.type}
                  </span>
                  {field.required && <span className="text-xs text-red-500">Required</span>}
                </div>
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="p-1 text-stone-400 hover:text-stone-600 disabled:opacity-30"
                    disabled={idx === 0}
                    onClick={() => moveField(field.id, 'up')}
                    title="Move up"
                  >
                    &#9650;
                  </button>
                  <button
                    type="button"
                    className="p-1 text-stone-400 hover:text-stone-600 disabled:opacity-30"
                    disabled={idx === fields.length - 1}
                    onClick={() => moveField(field.id, 'down')}
                    title="Move down"
                  >
                    &#9660;
                  </button>
                  <button
                    type="button"
                    className="p-1 text-stone-400 hover:text-red-500"
                    onClick={() => removeField(field.id)}
                    title="Remove field"
                  >
                    &#10005;
                  </button>
                </div>
              </div>

              {isExpanded && (
                <CardContent className="border-t border-stone-100 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Field Label"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="e.g., Dietary Restrictions"
                      required
                    />
                    <Select
                      label="Field Type"
                      value={field.type}
                      onChange={(e) =>
                        updateField(field.id, { type: e.target.value as IntakeFieldType })
                      }
                      options={FIELD_TYPE_OPTIONS}
                    />
                  </div>
                  <Input
                    label="Description / Help Text (optional)"
                    value={field.description || ''}
                    onChange={(e) => updateField(field.id, { description: e.target.value })}
                    placeholder="Additional instructions for the client..."
                  />
                  {!needsOptions(field.type) && field.type !== 'allergy_picker' && (
                    <Input
                      label="Placeholder (optional)"
                      value={field.placeholder || ''}
                      onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                      placeholder="Placeholder text shown in the input..."
                    />
                  )}
                  {needsOptions(field.type) && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-stone-700">
                        Options (one per line)
                      </label>
                      <textarea
                        className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        rows={4}
                        value={(field.options || []).join('\n')}
                        onChange={(e) =>
                          updateField(field.id, {
                            options: e.target.value.split('\n').filter((o) => o.trim()),
                          })
                        }
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                      />
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select
                      label="Map to Client Field"
                      value={field.mapToClientField || ''}
                      onChange={(e) =>
                        updateField(field.id, {
                          mapToClientField: e.target.value || undefined,
                        })
                      }
                      options={MAPPED_FIELD_OPTIONS}
                      helperText="Auto-apply this value to the client profile"
                    />
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm text-stone-700 pb-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                        />
                        Required field
                      </label>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}

        <Button size="sm" variant="ghost" onClick={addField}>
          + Add Another Field
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-stone-200">
        <Button onClick={handleSubmit} loading={saving} disabled={!name.trim()}>
          {initialForm ? 'Save Changes' : 'Create Form'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
