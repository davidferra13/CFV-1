'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import {
  createCustomFieldDefinition,
  deleteCustomFieldDefinition,
} from '@/lib/custom-fields/actions'
import type {
  CustomFieldDefinition,
  CustomFieldEntityType,
  CustomFieldType,
} from '@/lib/custom-fields/actions'

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTITY_LABELS: Record<CustomFieldEntityType, string> = {
  event: 'Events',
  client: 'Clients',
  recipe: 'Recipes',
}

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  select: 'Single Select',
  multi_select: 'Multi Select',
  toggle: 'Toggle (Yes/No)',
}

const ENTITY_TYPES: CustomFieldEntityType[] = ['event', 'client', 'recipe']
const FIELD_TYPES: CustomFieldType[] = [
  'text',
  'number',
  'date',
  'select',
  'multi_select',
  'toggle',
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialGrouped: Record<CustomFieldEntityType, CustomFieldDefinition[]>
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomFieldBuilder({ initialGrouped }: Props) {
  const [grouped, setGrouped] = useState(initialGrouped)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [entityType, setEntityType] = useState<CustomFieldEntityType>('event')
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState<CustomFieldType>('text')
  const [optionsRaw, setOptionsRaw] = useState('')
  const [isRequired, setIsRequired] = useState(false)

  function resetForm() {
    setFieldName('')
    setFieldType('text')
    setOptionsRaw('')
    setIsRequired(false)
    setShowForm(false)
  }

  function handleCreate() {
    if (!fieldName.trim()) {
      toast.error('Field name is required')
      return
    }

    const needsOptions = fieldType === 'select' || fieldType === 'multi_select'
    const options = needsOptions
      ? optionsRaw
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : null

    if (needsOptions && !options?.length) {
      toast.error('Select fields require at least one option')
      return
    }

    startTransition(async () => {
      try {
        const newDef = await createCustomFieldDefinition({
          entity_type: entityType,
          field_name: fieldName.trim(),
          field_type: fieldType,
          options,
          is_required: isRequired,
          display_order: grouped[entityType].length,
        })

        setGrouped((prev) => ({
          ...prev,
          [entityType]: [...prev[entityType], newDef],
        }))

        toast.success('Custom field created')
        resetForm()
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to create field')
      }
    })
  }

  function handleDelete(def: CustomFieldDefinition) {
    startTransition(async () => {
      try {
        await deleteCustomFieldDefinition(def.id)
        setGrouped((prev) => ({
          ...prev,
          [def.entity_type]: prev[def.entity_type].filter((d) => d.id !== def.id),
        }))
        toast.success('Field deleted')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to delete field')
      }
    })
  }

  const needsOptions = fieldType === 'select' || fieldType === 'multi_select'

  return (
    <div className="space-y-6">
      {/* Add Field Button */}
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setShowForm((v) => !v)} disabled={isPending}>
          {showForm ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Field
            </>
          )}
        </Button>
      </div>

      {/* Creation Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Custom Field</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Entity type */}
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Attach to</label>
              <div className="flex gap-2">
                {ENTITY_TYPES.map((et) => (
                  <button
                    key={et}
                    type="button"
                    onClick={() => setEntityType(et)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                      entityType === et
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-surface text-stone-300 border-stone-600 hover:border-stone-500'
                    }`}
                  >
                    {ENTITY_LABELS[et]}
                  </button>
                ))}
              </div>
            </div>

            {/* Field name */}
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Field Name</label>
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g. Dietary Restrictions"
                maxLength={100}
                className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
              />
            </div>

            {/* Field type */}
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Field Type</label>
              <select
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
                className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {FIELD_TYPE_LABELS[ft]}
                  </option>
                ))}
              </select>
            </div>

            {/* Options (select / multi_select only) */}
            {needsOptions && (
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  Options <span className="text-stone-400 font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={optionsRaw}
                  onChange={(e) => setOptionsRaw(e.target.value)}
                  placeholder="e.g. Option A, Option B, Option C"
                  className="w-full border border-stone-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>
            )}

            {/* Required toggle */}
            <div className="flex items-center gap-2">
              <input
                id="is-required"
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="h-4 w-4 rounded border-stone-600 text-stone-100 focus:ring-stone-500"
              />
              <label htmlFor="is-required" className="text-sm text-stone-300 cursor-pointer">
                Required field
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="primary" onClick={handleCreate} disabled={isPending}>
                {isPending ? 'Creating…' : 'Create Field'}
              </Button>
              <Button variant="secondary" onClick={resetForm} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Fields grouped by entity type */}
      {ENTITY_TYPES.map((et) => {
        const fields = grouped[et]
        return (
          <Card key={et}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{ENTITY_LABELS[et]}</CardTitle>
                <Badge variant={fields.length > 0 ? 'default' : 'info'}>
                  {fields.length} field{fields.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <p className="text-sm text-stone-400 italic">
                  No custom fields yet. Click &quot;Add Custom Field&quot; above.
                </p>
              ) : (
                <div className="divide-y divide-stone-800">
                  {fields.map((def) => (
                    <div key={def.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-stone-100 truncate">
                            {def.field_name}
                          </span>
                          {def.is_required && <Badge variant="warning">Required</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-stone-500">
                            {FIELD_TYPE_LABELS[def.field_type]}
                          </span>
                          {def.options && def.options.length > 0 && (
                            <span className="text-xs text-stone-400">
                              ({(def.options as string[]).join(', ')})
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(def)}
                        disabled={isPending}
                        className="text-red-500 hover:text-red-700 hover:bg-red-950 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
