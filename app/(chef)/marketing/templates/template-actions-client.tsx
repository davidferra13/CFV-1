'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { toast } from 'sonner'
import { deleteCampaignTemplate } from '@/lib/marketing/actions'
import { useDeferredAction } from '@/lib/hooks/use-deferred-action'

export function TemplateActionsClient({ templateId }: { templateId: string }) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)

  const { execute: deferDelete } = useDeferredAction({
    delay: 8000,
    toastMessage: 'Template deleted',
    onExecute: async () => {
      await deleteCampaignTemplate(templateId)
      router.refresh()
    },
    onUndo: () => {
      setIsDeleted(false)
      setShowDeleteConfirm(false)
    },
    onError: (err) => {
      setIsDeleted(false)
      toast.error(err instanceof Error ? err.message : 'Failed to delete template')
    },
  })

  function handleDelete() {
    setShowDeleteConfirm(true)
  }

  function handleConfirmedDelete() {
    setShowDeleteConfirm(false)
    setIsDeleted(true)
    deferDelete()
  }

  if (isDeleted) {
    return <span className="text-xs text-stone-500 italic">Deleted (undo in toast)</span>
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={isDeleted}
        className="shrink-0 text-stone-400 hover:text-red-600"
      >
        {isDeleted ? '…' : 'Delete'}
      </Button>
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this template?"
        description="You'll have 8 seconds to undo."
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleted}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
