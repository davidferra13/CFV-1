'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createCallScript,
  updateCallScript,
  deleteCallScript,
} from '@/lib/prospecting/script-actions'
import type { CallScript } from '@/lib/prospecting/types'
import { PROSPECT_CATEGORIES, PROSPECT_CATEGORY_LABELS } from '@/lib/prospecting/constants'
import { Loader2, Save, Trash2, Plus } from '@/components/ui/icons'
import { useRouter } from 'next/navigation'
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'

interface ScriptEditorProps {
  script?: CallScript | null
  onSaved?: () => void
}

export function ScriptEditor({ script, onSaved }: ScriptEditorProps) {
  const router = useRouter()
  const [name, setName] = useState(script?.name ?? '')
  const [category, setCategory] = useState(script?.category ?? '')
  const [scriptBody, setScriptBody] = useState(script?.script_body ?? '')
  const [isDefault, setIsDefault] = useState(script?.is_default ?? false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const defaultData = useMemo(
    () => ({
      name: script?.name ?? '',
      category: script?.category ?? '',
      scriptBody: script?.script_body ?? '',
      isDefault: script?.is_default ?? false,
    }),
    [script]
  )

  const currentData = useMemo(
    () => ({
      name,
      category,
      scriptBody,
      isDefault,
    }),
    [name, category, scriptBody, isDefault]
  )

  const protection = useProtectedForm({
    surfaceId: 'call-script',
    recordId: script?.id,
    tenantId: 'admin',
    schemaVersion: 1,
    defaultData,
    currentData,
    throttleMs: 10000,
  })

  function applyFormData(data: typeof defaultData) {
    setName(data.name)
    setCategory(data.category)
    setScriptBody(data.scriptBody)
    setIsDefault(data.isDefault ?? false)
  }

  function handleSave() {
    if (!name.trim() || !scriptBody.trim()) {
      setError('Name and script body are required.')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        if (script) {
          await updateCallScript(script.id, {
            name: name.trim(),
            category: category || null,
            script_body: scriptBody.trim(),
            is_default: isDefault,
          })
        } else {
          await createCallScript({
            name: name.trim(),
            category: category || null,
            script_body: scriptBody.trim(),
            is_default: isDefault,
          })
        }
        protection.markCommitted()
        router.refresh()
        onSaved?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save script')
      }
    })
  }

  function handleDelete() {
    if (!script) return
    setShowDeleteConfirm(true)
  }

  function handleConfirmedDelete() {
    if (!script) return
    setShowDeleteConfirm(false)
    startTransition(async () => {
      try {
        await deleteCallScript(script.id)
        router.refresh()
        onSaved?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete script')
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
        if (d) applyFormData(d)
      }}
      onDiscard={protection.discardDraft}
      saveState={protection.saveState}
      badgePosition="inline"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{script ? 'Edit Script' : 'New Call Script'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-950 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-300">Script Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Yacht Club Intro, General Cold Call"
              className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-300">Category (optional)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Script category"
              className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm"
            >
              <option value="">No specific category</option>
              {PROSPECT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {PROSPECT_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            <p className="text-xs text-stone-500">
              If set, this script will auto-suggest when calling prospects of this category.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-300">Script Body</label>
            <textarea
              value={scriptBody}
              onChange={(e) => setScriptBody(e.target.value)}
              placeholder={`"Hi, this is [Chef Name] - I'm a private chef here in [Region]. I work with several [clubs/families/venues] in the area and I was reaching out because..."\n\nWrite your full cold-calling script here. Include:\n• Opening hook\n• Value proposition\n• Key talking points\n• Objection handling\n• Close / next step ask`}
              rows={14}
              className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-default"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-stone-600 text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="is-default" className="text-sm text-stone-300">
              Set as default script (used when no category-specific script exists)
            </label>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : script ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Script
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Script
                </>
              )}
            </Button>
            {script && (
              <Button variant="danger" onClick={handleDelete} disabled={isPending}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>

          <ConfirmModal
            open={showDeleteConfirm}
            title="Delete this script?"
            description="This cannot be undone."
            confirmLabel="Delete"
            variant="danger"
            loading={isPending}
            onConfirm={handleConfirmedDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </CardContent>
      </Card>
    </FormShield>
  )
}

interface ScriptListProps {
  scripts: CallScript[]
  onSelect: (script: CallScript) => void
  selectedId?: string
}

export function ScriptList({ scripts, onSelect, selectedId }: ScriptListProps) {
  if (scripts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-600 p-8 text-center text-stone-500">
        <p className="text-sm">No call scripts yet.</p>
        <p className="text-xs mt-1">Create your first cold-calling script to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {scripts.map((script) => (
        <button
          key={script.id}
          onClick={() => onSelect(script)}
          className={`w-full text-left rounded-lg border p-3 transition-colors ${
            selectedId === script.id
              ? 'border-brand-500 bg-brand-950'
              : 'border-stone-700 hover:border-stone-600 hover:bg-stone-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-100">{script.name}</span>
            {script.is_default && (
              <span className="rounded-full bg-brand-900 px-2 py-0.5 text-xs font-medium text-brand-400">
                Default
              </span>
            )}
          </div>
          {script.category && (
            <span className="mt-1 text-xs text-stone-500">
              {PROSPECT_CATEGORY_LABELS[script.category as keyof typeof PROSPECT_CATEGORY_LABELS] ??
                script.category}
            </span>
          )}
          <p className="mt-1 text-xs text-stone-400 line-clamp-2">{script.script_body}</p>
        </button>
      ))}
    </div>
  )
}
