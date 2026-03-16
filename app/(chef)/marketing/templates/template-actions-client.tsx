'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { toast } from 'sonner'
import { deleteCampaignTemplate } from '@/lib/marketing/actions'
import { useDeferredAction } from '@/hooks/use-deferred-action'

export function TemplateActionsClient({ templateId }: { templateId: string }) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const { execute: deferDelete, deleted } = useDeferredAction({
    delay: 8000,
    toastMessage: 'Template deleted',
    onExecute: async () => {
      await deleteCampaignTemplate(templateId)
      router.refresh()
    },
    onUndo: () => {
      setDeleted(false)
      setShowDeleteConfirm(false)
    },
    onError: (err) => {
      setDeleted(false)
      toast.error(err instanceof Error ? err.message : 'Failed to delete template')
    },
  })

  function handleDelete() {
    setShowDeleteConfirm(true)
  }

  function handleConfirmedDelete() {
    setShowDeleteConfirm(false)
    setDeleted(true)
    deferDelete()
  }

  if (deleted) {
    return <span className="text-xs text-stone-500 italic">Deleted (undo in toast)</span>
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={deleted}
        className="shrink-0 text-stone-400 hover:text-red-600"
      >
        {deleted ? '…' : 'Delete'}
      </Button>
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this template?"
        description="You'll have 8 seconds to undo."
        confirmLabel="Delete"
        variant="danger"
        loading={deleted}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
