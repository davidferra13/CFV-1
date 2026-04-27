'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type ResponseTemplate,
  type TemplateCategory,
} from '@/lib/communication/templates/actions'
import { TEMPLATE_VARIABLES } from '@/lib/communication/templates/constants'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'
import { TiptapEditor } from '@/components/ui/tiptap-editor'

type Props = {
  template: ResponseTemplate | null
  onClose: () => void
  chefId: string
}

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'auto_response', label: 'Auto-Response' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'menu_proposal', label: 'Menu Proposal' },
  { value: 'booking_confirmation', label: 'Booking Confirmation' },
  { value: 'payment_reminder', label: 'Payment Reminder' },
  { value: 'post_event', label: 'Post-Event' },
  { value: 'pre_event', label: 'Pre-Event' },
  { value: 'general', label: 'General' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 're_engagement', label: 'Re-engagement' },
]

export function TemplateEditor({ template, onClose, chefId }: Props) {
  const isNew = !template
  const [name, setName] = useState(template?.name ?? '')
  const [category, setCategory] = useState<TemplateCategory>(
    (template?.category as TemplateCategory) ?? 'general'
  )
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [body, setBody] = useState(template?.body ?? '')
  const [isDefault, setIsDefault] = useState(template?.is_default ?? false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const defaultData = useMemo(
    () => ({
      name: template?.name ?? '',
      category: (template?.category as TemplateCategory) ?? 'general',
      subject: template?.subject ?? '',
      body: template?.body ?? '',
      isDefault: template?.is_default ?? false,
    }),
    [template]
  )

  const currentData = useMemo(
    () => ({
      name,
      category,
      subject,
      body,
      isDefault,
    }),
    [name, category, subject, body, isDefault]
  )

  const protection = useProtectedForm({
    surfaceId: 'email-template',
    recordId: template?.id ?? null,
    tenantId: chefId,
    defaultData,
    currentData,
  })

  function applyDraftData(data: Record<string, unknown>) {
    if (typeof data.name === 'string') setName(data.name)
    if (typeof data.category === 'string') setCategory(data.category as TemplateCategory)
    if (typeof data.subject === 'string') setSubject(data.subject)
    if (typeof data.body === 'string') setBody(data.body)
    if (typeof data.isDefault === 'boolean') setIsDefault(data.isDefault)
  }

  function insertVariable(key: string) {
    setBody((prev) => prev + `{{${key}}}`)
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      try {
        if (isNew) {
          const result = await createTemplate({
            name,
            category,
            subject,
            body,
            is_default: isDefault,
          })
          if (result.success) {
            protection.markCommitted()
            onClose()
          } else setError(result.error ?? 'Failed to create.')
        } else {
          const result = await updateTemplate({
            id: template!.id,
            name,
            subject,
            body,
            is_default: isDefault,
          })
          if (result.success) {
            protection.markCommitted()
            onClose()
          } else setError(result.error ?? 'Failed to update.')
        }
      } catch {
        setError('An unexpected error occurred.')
      }
    })
  }

  function handleDelete() {
    if (!template) return
    startTransition(async () => {
      try {
        await deleteTemplate(template.id)
        onClose()
      } catch {
        setError('Failed to delete.')
      }
    })
  }

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyDraftData(d)
      }}
      onDiscard={protection.discardDraft}
      saveState={protection.saveState}
    >
      <div className="bg-stone-800 border border-stone-700 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-stone-400 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-stone-100 text-sm"
              placeholder="Template name"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TemplateCategory)}
              disabled={!isNew}
              className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-stone-100 text-sm disabled:opacity-50"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-stone-400 mb-1">Subject Line</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-stone-100 text-sm"
            placeholder="Email subject"
          />
        </div>

        <div>
          <TiptapEditor
            label="Body"
            value={body}
            onChange={setBody}
            minHeight={200}
            placeholder="Template body..."
            toolbar={['text', 'heading', 'list', 'insert']}
          />
        </div>

        <div>
          <label className="block text-xs text-stone-400 mb-1">Insert Variable</label>
          <div className="flex flex-wrap gap-1">
            {TEMPLATE_VARIABLES.map((v) => (
              <button
                key={v.key}
                onClick={() => insertVariable(v.key)}
                title={`${v.description} (e.g., ${v.example})`}
                className="px-2 py-0.5 bg-stone-900 border border-stone-700 rounded text-xs text-stone-300 hover:border-amber-600 hover:text-amber-400 transition-colors"
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded bg-stone-900 border-stone-700 text-amber-600"
          />
          <span className="text-xs text-stone-300">Set as default for this category</span>
        </label>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex items-center justify-between pt-2 border-t border-stone-700">
          <div>
            {!isNew && (
              <button
                onClick={handleDelete}
                disabled={pending}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-stone-400 hover:text-stone-200 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={pending || !name || !subject || !body}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {pending ? 'Saving...' : isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </FormShield>
  )
}
