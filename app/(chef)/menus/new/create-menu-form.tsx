'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { SaveStateBadge } from '@/components/ui/save-state-badge'
import { DraftRestorePrompt } from '@/components/ui/draft-restore-prompt'
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog'
import { createMenu } from '@/lib/menus/actions'
import { useDurableDraft } from '@/lib/drafts/use-durable-draft'
import { useUnsavedChangesGuard } from '@/lib/navigation/use-unsaved-changes-guard'
import { useIdempotentMutation } from '@/lib/offline/use-idempotent-mutation'
import { ValidationError } from '@/lib/errors/app-error'
import { mapErrorToUI } from '@/lib/errors/map-error-to-ui'

type MenuDraftData = {
  name: string
  description: string
  cuisine_type: string
  service_style: string
}

export function CreateMenuForm({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [serviceStyle, setServiceStyle] = useState('')

  const currentFormData = useMemo<MenuDraftData>(
    () => ({
      name,
      description,
      cuisine_type: cuisineType,
      service_style: serviceStyle,
    }),
    [name, description, cuisineType, serviceStyle]
  )
  const initialFormData = useMemo<MenuDraftData>(
    () => ({
      name: '',
      description: '',
      cuisine_type: '',
      service_style: '',
    }),
    []
  )
  const [committedFormData, setCommittedFormData] = useState<MenuDraftData>(initialFormData)

  const createMutation = useIdempotentMutation<any, any>('menus/create', {
    mutation: createMenu as any,
  })

  const durableDraft = useDurableDraft<MenuDraftData>('menu-create-form', null, {
    schemaVersion: 1,
    tenantId,
    defaultData: initialFormData,
    debounceMs: 700,
  })

  const isDirty = useMemo(
    () => JSON.stringify(currentFormData) !== JSON.stringify(committedFormData),
    [committedFormData, currentFormData]
  )

  const unsavedGuard = useUnsavedChangesGuard({
    isDirty,
    onSaveDraft: () => durableDraft.persistDraft(currentFormData, { immediate: true }),
    canSaveDraft: true,
    saveState: createMutation.saveState,
  })

  useEffect(() => {
    if (!isDirty) return
    void durableDraft.persistDraft(currentFormData)
    if (createMutation.saveState.status === 'SAVED') {
      createMutation.markUnsaved()
    }
  }, [createMutation, currentFormData, durableDraft, isDirty])

  const applyFormData = (data: MenuDraftData) => {
    setName(data.name)
    setDescription(data.description)
    setCuisineType(data.cuisine_type)
    setServiceStyle(data.service_style)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await durableDraft.persistDraft(currentFormData, { immediate: true })

      if (!name.trim()) {
        throw new ValidationError('Menu name is required')
      }

      const mutationResult = await createMutation.mutate({
        name,
        description: description || undefined,
        cuisine_type: cuisineType || undefined,
        service_style: serviceStyle ? (serviceStyle as any) : undefined,
      })
      if (mutationResult.queued) {
        setLoading(false)
        return
      }
      const result = mutationResult.result as any

      if (result?.menu?.id) {
        setCommittedFormData(currentFormData)
        await durableDraft.clearDraft()
        router.push(`/menus/${result.menu.id}`)
      } else {
        throw new Error('Failed to create menu')
      }
    } catch (err: unknown) {
      const uiError = mapErrorToUI(err)
      setError(uiError.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-end">
        <SaveStateBadge state={createMutation.saveState} onRetry={createMutation.retryLast} />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Menu Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Menu Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer BBQ Menu"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => void durableDraft.persistDraft(currentFormData, { immediate: true })}
              placeholder="Describe this menu template..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Cuisine Type</label>
            <Input
              type="text"
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
              placeholder="e.g., Italian, Japanese, American BBQ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Service Style</label>
            <select
              className="w-full px-3 py-2 border border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              value={serviceStyle}
              onChange={(e) => setServiceStyle(e.target.value)}
              aria-label="Service style"
            >
              <option value="">Select style (optional)</option>
              <option value="plated">Plated</option>
              <option value="family_style">Family Style</option>
              <option value="buffet">Buffet</option>
              <option value="cocktail">Cocktail</option>
              <option value="tasting_menu">Tasting Menu</option>
              <option value="other">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => unsavedGuard.requestNavigation(() => router.back())}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Menu'}
        </Button>
      </div>

      <DraftRestorePrompt
        open={durableDraft.showRestorePrompt}
        lastSavedAt={durableDraft.pendingDraft?.lastSavedAt ?? durableDraft.lastSavedAt}
        onRestore={() => {
          const restored = durableDraft.restoreDraft()
          if (restored) {
            applyFormData(restored)
          }
        }}
        onDiscard={() => void durableDraft.discardDraft()}
      />

      <UnsavedChangesDialog
        open={unsavedGuard.open}
        canSaveDraft={unsavedGuard.canSaveDraft}
        onStay={unsavedGuard.onStay}
        onLeave={unsavedGuard.onLeave}
        onSaveDraftAndLeave={() => void unsavedGuard.onSaveDraftAndLeave()}
      />
    </form>
  )
}
