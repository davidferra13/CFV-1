// Client Intake Forms - Client Component
// Handles form creation, editing, sharing, and deletion with optimistic UI.

'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  createIntakeForm,
  updateIntakeForm,
  deleteIntakeForm,
  createIntakeShare,
  createDefaultForms,
  type IntakeFormField,
} from '@/lib/clients/intake-actions'
import { Button } from '@/components/ui/button'

interface IntakeForm {
  id: string
  name: string
  description: string | null
  fields: IntakeFormField[]
  is_default: boolean
  response_count: number
  created_at: string
}

export function IntakeFormsClient({ forms: initialForms }: { forms: IntakeForm[] }) {
  const [forms, setForms] = useState<IntakeForm[]>(initialForms)
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Form creation state
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  function handleCreateDefaults() {
    startTransition(async () => {
      try {
        const result = await createDefaultForms()
        if (result.created > 0) {
          // Reload page to get fresh data
          window.location.reload()
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create default templates')
      }
    })
  }

  function handleCreate() {
    if (!newName.trim()) return
    const previous = [...forms]

    startTransition(async () => {
      try {
        const defaultFields: IntakeFormField[] = [
          { id: 'field_1', type: 'text', label: 'Question 1', required: false },
        ]
        const form = await createIntakeForm({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
          fields: defaultFields,
        })
        setForms([{ ...form, response_count: 0 }, ...forms])
        setNewName('')
        setNewDescription('')
        setShowCreate(false)
      } catch (err) {
        setForms(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to create form')
      }
    })
  }

  function handleDelete(formId: string) {
    if (!confirm('Delete this form? Existing responses will be kept.')) return
    const previous = [...forms]
    setForms(forms.filter((f) => f.id !== formId))

    startTransition(async () => {
      try {
        await deleteIntakeForm(formId)
      } catch (err) {
        setForms(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to delete form')
      }
    })
  }

  async function handleShare(formId: string) {
    try {
      const share = await createIntakeShare(formId)
      const url = `${window.location.origin}/intake/${share.share_token}`
      await navigator.clipboard.writeText(url)
      setCopiedToken(formId)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to copy share link')
    }
  }

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Form'}
        </Button>
        {forms.length === 0 && (
          <Button variant="secondary" onClick={handleCreateDefaults} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Default Templates'}
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Form Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. New Client Assessment"
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Description (optional)
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description of this form's purpose"
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
              />
            </div>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={isPending || !newName.trim()}
            >
              {isPending ? 'Creating...' : 'Create Form'}
            </Button>
          </div>
        </div>
      )}

      {/* Forms table */}
      {forms.length === 0 && !showCreate ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center dark:border-stone-700 dark:bg-stone-800">
          <p className="text-stone-500 dark:text-stone-400">
            No intake forms yet. Create one or use the default templates to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-700">
          <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-700">
            <thead className="bg-stone-50 dark:bg-stone-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Form Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Fields
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Responses
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white dark:divide-stone-700 dark:bg-stone-900">
              {forms.map((form) => (
                <tr key={form.id}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                        {form.name}
                      </p>
                      {form.description && (
                        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                          {form.description}
                        </p>
                      )}
                      {form.is_default && (
                        <span className="mt-1 inline-block rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                          Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
                    {(form.fields as IntakeFormField[])?.length || 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
                    {form.response_count}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => handleShare(form.id)}>
                        {copiedToken === form.id ? 'Copied!' : 'Copy Link'}
                      </Button>
                      <Button variant="ghost" onClick={() => handleDelete(form.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
