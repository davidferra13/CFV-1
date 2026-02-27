'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { deleteCampaignTemplate } from '@/lib/marketing/actions'

export function TemplateActionsClient({ templateId }: { templateId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleDelete() {
    setShowDeleteConfirm(true)
  }

  async function handleConfirmedDelete() {
    setShowDeleteConfirm(false)
    setLoading(true)
    try {
      await deleteCampaignTemplate(templateId)
      router.refresh()
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={loading}
        className="shrink-0 text-stone-400 hover:text-red-600"
      >
        {loading ? '…' : 'Delete'}
      </Button>
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this template?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={loading}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
