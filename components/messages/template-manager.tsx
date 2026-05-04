'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createResponseTemplate,
  updateResponseTemplate,
  deleteResponseTemplate,
  seedDefaultTemplates,
} from '@/lib/messages/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { toast } from 'sonner'
import { useDeferredAction } from '@/lib/hooks/use-deferred-action'

type Template = {
  id: string
  name: string
  template_text: string
  category: string | null
  is_active: boolean | null
  usage_count: number | null
  created_at: string
  updated_at: string
  tenant_id: string
}

const CATEGORY_LABELS: Record<string, string> = {
  first_response: 'First Response',
  mid_service: 'Mid-Service',
  follow_up: 'Follow-Up',
  scheduling: 'Scheduling',
  unavailable: 'Unavailable',
  thank_you: 'Thank You',
  general: 'General',
}

interface TemplateManagerProps {
  templates: Template[]
}

export function TemplateManager({ templates }: TemplateManagerProps) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null)

  // Form state for create/edit
  const [formName, setFormName] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCategory, setFormCategory] = useState('')

  // Group templates by category
  const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
    const cat = t.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  function startEdit(template: Template) {
    setEditing(template.id)
    setFormName(template.name)
    setFormContent(template.template_text)
    setFormCategory(template.category || '')
    setCreating(false)
    setError(null)
  }

  function startCreate() {
    setCreating(true)
    setEditing(null)
    setFormName('')
    setFormContent('')
    setFormCategory('')
    setError(null)
  }

  function cancelForm() {
    setEditing(null)
    setCreating(false)
    setError(null)
  }

  async function handleSave() {
    setLoading(true)
    setError(null)

    try {
      if (editing) {
        await updateResponseTemplate(editing, {
          name: formName,
          template_text: formContent,
          category: formCategory || null,
        })
      } else {
        await createResponseTemplate({
          name: formName,
          template_text: formContent,
          category: formCategory || null,
        })
      }
      cancelForm()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setLoading(false)
    }
  }

  const { execute: deferTemplateDelete } = useDeferredAction({
    delay: 8000,
    toastMessage: 'Template deleted',
    onExecute: async () => {
      if (deleteTemplateId) await deleteResponseTemplate(deleteTemplateId)
      router.refresh()
    },
    onUndo: () => {
      setDeleteTemplateId(null)
    },
    onError: (err) => {
      setDeleteTemplateId(null)
      toast.error(err instanceof Error ? err.message : 'Failed to delete template')
    },
  })

  function handleDelete(id: string) {
    setDeleteTemplateId(id)
  }

  function handleConfirmedDelete() {
    if (!deleteTemplateId) return
    deferTemplateDelete()
  }

  async function handleSeedDefaults() {
    setLoading(true)
    setError(null)
    try {
      const result = await seedDefaultTemplates()
      if (result.seeded) {
        router.refresh()
      } else {
        setError('Default templates already exist. Delete existing templates first to re-seed.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed defaults')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={startCreate} disabled={creating}>
          + New Template
        </Button>
        {templates.length === 0 && (
          <Button variant="secondary" onClick={handleSeedDefaults} disabled={loading}>
            Load Default Templates
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(creating || editing) && (
        <Card className="p-6 border-brand-700">
          <h3 className="text-lg font-semibold mb-4">
            {editing ? 'Edit Template' : 'New Template'}
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-stone-300 block mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. First response - new inquiry"
                  className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-300 block mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">General</option>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-300 block mb-1">
                Template Content
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Write your template message here. Use [name], [date], [time], [link] as placeholders."
                rows={4}
                className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={cancelForm}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || !formName.trim() || !formContent.trim()}
              >
                {loading ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Templates List */}
      {templates.length === 0 && !creating ? (
        <div className="text-center py-12 text-stone-400">
          <p className="text-lg mb-2">No response templates yet</p>
          <p className="text-sm">Create your own or load the default set to get started.</p>
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, catTemplates]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
                {CATEGORY_LABELS[category] || category}
              </h3>
              <div className="space-y-2">
                {catTemplates.map((t) => (
                  <Card key={t.id} className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-100 text-sm">{t.name}</p>
                        <p className="text-sm text-stone-400 mt-1 whitespace-pre-wrap">
                          {t.template_text}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(t)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(t.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-950"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
      )}

      <ConfirmModal
        open={deleteTemplateId !== null}
        title="Delete this template?"
        description="You'll have 8 seconds to undo."
        confirmLabel="Delete"
        variant="danger"
        loading={loading}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteTemplateId(null)}
      />
    </div>
  )
}
