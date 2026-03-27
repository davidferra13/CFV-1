'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Select } from '@/components/ui/select'
import {
  saveFrontOfHouseTemplate,
  deleteFrontOfHouseTemplate,
} from '@/lib/front-of-house/menuGeneratorService'

type TemplateRow = {
  id: string
  slug: string
  name: string
  description?: string | null
  type: 'default' | 'holiday' | 'special_event'
  event_type?: string | null
  theme?: string | null
  layout: Record<string, unknown>
  placeholders: string[]
  styles: Record<string, unknown>
  default_fields: Record<string, boolean>
  is_system?: boolean
}

type Props = {
  templates: TemplateRow[]
}

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

export function MenuTemplateSettings({ templates }: Props) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({
    id: '',
    slug: '',
    name: '',
    description: '',
    type: 'default',
    event_type: 'regular_menu',
    theme: '',
    placeholders: 'chefName,date,hostName,theme,winePairing,specialNote,customStamp',
    layout: prettyJson({ header: 'centered', showStamp: false }),
    styles: prettyJson({}),
    default_fields: prettyJson({}),
  })

  const customTemplates = useMemo(
    () => templates.filter((template) => !template.is_system),
    [templates]
  )
  const systemTemplates = useMemo(
    () => templates.filter((template) => template.is_system),
    [templates]
  )

  function resetForm() {
    setEditingId(null)
    setCreating(false)
    setError(null)
    setForm({
      id: '',
      slug: '',
      name: '',
      description: '',
      type: 'default',
      event_type: 'regular_menu',
      theme: '',
      placeholders: 'chefName,date,hostName,theme,winePairing,specialNote,customStamp',
      layout: prettyJson({ header: 'centered', showStamp: false }),
      styles: prettyJson({}),
      default_fields: prettyJson({}),
    })
  }

  function startCreate() {
    resetForm()
    setCreating(true)
  }

  function startEdit(template: TemplateRow) {
    setEditingId(template.id)
    setCreating(false)
    setError(null)
    setForm({
      id: template.id,
      slug: template.slug,
      name: template.name,
      description: template.description ?? '',
      type: template.type,
      event_type: template.event_type ?? 'regular_menu',
      theme: template.theme ?? '',
      placeholders: (template.placeholders ?? []).join(','),
      layout: prettyJson(template.layout ?? {}),
      styles: prettyJson(template.styles ?? {}),
      default_fields: prettyJson(template.default_fields ?? {}),
    })
  }

  async function onSave() {
    setSaving(true)
    setError(null)
    try {
      const layout = JSON.parse(form.layout || '{}')
      const styles = JSON.parse(form.styles || '{}')
      const defaultFields = JSON.parse(form.default_fields || '{}')
      await saveFrontOfHouseTemplate({
        id: form.id || undefined,
        slug: form.slug.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        type: form.type as 'default' | 'holiday' | 'special_event',
        event_type: form.event_type as any,
        theme: form.theme.trim() || null,
        placeholders: form.placeholders
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        layout,
        styles,
        default_fields: defaultFields,
      })
      resetForm()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  function onDelete(templateId: string) {
    setPendingDeleteId(templateId)
    setShowDeleteConfirm(true)
  }

  async function handleConfirmedDelete() {
    if (!pendingDeleteId) return
    setShowDeleteConfirm(false)
    setSaving(true)
    setError(null)
    try {
      await deleteFrontOfHouseTemplate(pendingDeleteId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    } finally {
      setSaving(false)
      setPendingDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex gap-2">
        <Button onClick={startCreate}>New Template</Button>
        {(creating || editingId) && (
          <Button variant="secondary" onClick={resetForm}>
            Cancel
          </Button>
        )}
      </div>

      {(creating || editingId) && (
        <Card className="p-5 space-y-3">
          <h3 className="text-lg font-semibold text-stone-100">
            {editingId ? 'Edit template' : 'Create template'}
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm"
              placeholder="Short name (e.g. birthday-modern)"
              value={form.slug}
              onChange={(e) => setForm((value) => ({ ...value, slug: e.target.value }))}
            />
            <input
              className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm"
              placeholder="Template name"
              value={form.name}
              onChange={(e) => setForm((value) => ({ ...value, name: e.target.value }))}
            />
            <Select
              value={form.type}
              onChange={(e) => setForm((value) => ({ ...value, type: e.target.value }))}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'holiday', label: 'Holiday' },
                { value: 'special_event', label: 'Special Event' },
              ]}
            />
            <Select
              value={form.event_type}
              onChange={(e) => setForm((value) => ({ ...value, event_type: e.target.value }))}
              options={[
                { value: 'regular_menu', label: 'Regular Menu' },
                { value: 'birthday', label: 'Birthday' },
                { value: 'bachelorette_party', label: 'Bachelorette Party' },
                { value: 'anniversary', label: 'Anniversary' },
                { value: 'holiday', label: 'Holiday' },
                { value: 'corporate_event', label: 'Corporate Event' },
              ]}
            />
            <input
              className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm md:col-span-2"
              placeholder="Theme (optional)"
              value={form.theme}
              onChange={(e) => setForm((value) => ({ ...value, theme: e.target.value }))}
            />
            <textarea
              className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm md:col-span-2"
              rows={2}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((value) => ({ ...value, description: e.target.value }))}
            />
            <textarea
              className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-xs font-mono md:col-span-2"
              rows={3}
              placeholder="placeholders: comma-separated"
              value={form.placeholders}
              onChange={(e) => setForm((value) => ({ ...value, placeholders: e.target.value }))}
            />
            <textarea
              className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-xs font-mono"
              rows={6}
              placeholder="layout JSON"
              value={form.layout}
              onChange={(e) => setForm((value) => ({ ...value, layout: e.target.value }))}
            />
            <textarea
              className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-xs font-mono"
              rows={6}
              placeholder="styles JSON"
              value={form.styles}
              onChange={(e) => setForm((value) => ({ ...value, styles: e.target.value }))}
            />
            <textarea
              className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-xs font-mono md:col-span-2"
              rows={4}
              placeholder="default_fields JSON"
              value={form.default_fields}
              onChange={(e) => setForm((value) => ({ ...value, default_fields: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={onSave} disabled={saving || !form.slug.trim() || !form.name.trim()}>
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-stone-100">Custom Templates</h3>
        <p className="mt-1 text-xs text-stone-500">Editable templates stored for your tenant.</p>
        {customTemplates.length === 0 ? (
          <p className="mt-4 text-sm text-stone-400">No custom templates yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {customTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between rounded-lg border border-stone-700 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-stone-100">{template.name}</p>
                  <p className="text-xs text-stone-500">
                    {template.type} • {template.theme || template.event_type || 'No theme'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(template)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => onDelete(template.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-stone-100">System Templates</h3>
        <p className="mt-1 text-xs text-stone-500">
          Built-in holiday and event templates (read-only).
        </p>
        <div className="mt-4 space-y-2">
          {systemTemplates.map((template) => (
            <div key={template.id} className="rounded-lg border border-stone-700 p-3">
              <p className="text-sm font-medium text-stone-100">{template.name}</p>
              <p className="text-xs text-stone-500">
                {template.type} • {template.theme || template.event_type || 'No theme'}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this template?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={saving}
        onConfirm={handleConfirmedDelete}
        onCancel={() => {
          setShowDeleteConfirm(false)
          setPendingDeleteId(null)
        }}
      />
    </div>
  )
}
