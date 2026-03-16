'use client'

// Contract Template Editor
// Markdown editor for contract body with merge field helper chips.
// Used on the settings/contracts page to create and edit templates.

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createContractTemplate,
  updateContractTemplate,
  type CreateTemplateInput,
} from '@/lib/contracts/actions'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'

const MERGE_FIELDS = [
  '{{client_name}}',
  '{{event_date}}',
  '{{quoted_price}}',
  '{{deposit_amount}}',
  '{{cancellation_policy}}',
  '{{occasion}}',
  '{{guest_count}}',
  '{{event_location}}',
]

type Template = {
  id: string
  name: string
  body_markdown: string
  is_default: boolean
}

type Props = {
  template?: Template // if provided, we're editing; otherwise creating
  chefId: string
  onDone?: () => void
}

export function ContractTemplateEditor({ template, chefId, onDone }: Props) {
  const router = useRouter()
  const mergeFields = MERGE_FIELDS

  const [name, setName] = useState(template?.name ?? '')
  const [body, setBody] = useState(template?.body_markdown ?? defaultBody)
  const [isDefault, setIsDefault] = useState(template?.is_default ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Form protection (draft persistence + unsaved changes guard) ────────────
  const defaultData = useMemo(
    () => ({
      name: template?.name ?? '',
      body: template?.body_markdown ?? defaultBody,
    }),
    [template]
  )

  const currentData = useMemo(() => ({ name, body }), [name, body])

  const protection = useProtectedForm({
    surfaceId: 'contract-template',
    recordId: template?.id ?? null,
    tenantId: chefId,
    defaultData,
    currentData,
    throttleMs: 10_000,
  })

  const applyFormData = useCallback((data: Record<string, unknown>) => {
    if (typeof data.name === 'string') setName(data.name)
    if (typeof data.body === 'string') setBody(data.body)
  }, [])

  function insertMergeField(field: string) {
    setBody((prev) => prev + field)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const input: CreateTemplateInput = { name, body_markdown: body, is_default: isDefault }
      if (template) {
        await updateContractTemplate(template.id, input)
      } else {
        await createContractTemplate(input)
      }
      protection.markCommitted()
      router.refresh()
      onDone?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyFormData(d)
      }}
      onDiscard={protection.discardDraft}
      saveState={protection.saveState}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">Template name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard Private Dining Agreement"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1">
            Contract body <span className="text-stone-400">(Markdown)</span>
          </label>
          <div className="mb-2 flex flex-wrap gap-1">
            {mergeFields.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => insertMergeField(f)}
                className="rounded bg-amber-900 px-2 py-0.5 text-xs font-mono text-amber-800 hover:bg-amber-200 transition-colors"
              >
                {f}
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={18}
            required
            className="w-full rounded-lg border border-stone-600 p-3 font-mono text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
            placeholder="Write your contract in Markdown. Use {{merge_fields}} for dynamic values."
          />
          <p className="mt-1 text-xs text-stone-400">
            Click a merge field chip above to insert it at the cursor position.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_default"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded border-stone-600"
          />
          <label htmlFor="is_default" className="text-sm text-stone-300">
            Use as default template for new contracts
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : template ? 'Update template' : 'Create template'}
          </Button>
          {onDone && (
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </FormShield>
  )
}

const defaultBody = `# Private Chef Service Agreement

This Service Agreement is between the Chef and **{{client_name}}**.

## Event Details

- **Date:** {{event_date}}
- **Occasion:** {{occasion}}
- **Guests:** {{guest_count}}
- **Location:** {{event_location}}

## Service Fee

Total: **{{quoted_price}}**
Deposit (non-refundable): **{{deposit_amount}}**

## Cancellation Policy

{{cancellation_policy}}

## Scope of Service

Chef will provide menu planning, sourcing, on-site preparation, service, and kitchen cleanup as agreed.

## Client Responsibilities

Client will provide a safe, clean kitchen environment with adequate workspace and access.

By signing, Client agrees to all terms above.
`
