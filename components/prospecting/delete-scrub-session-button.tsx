'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Trash2 } from 'lucide-react'
import { deleteScrubSession } from '@/lib/prospecting/actions'

export function DeleteScrubSessionButton({
  sessionId,
  prospectCount,
}: {
  sessionId: string
  prospectCount: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleDelete() {
    setShowConfirm(true)
  }

  async function handleConfirmedDelete() {
    setShowConfirm(false)
    setBusy(true)
    try {
      await deleteScrubSession(sessionId)
      router.refresh()
    } catch {
      toast.error('Failed to delete session')
    } finally {
      setBusy(false)
    }
  }

  const confirmDescription =
    prospectCount > 0
      ? `This will delete the scrub session and its ${prospectCount} prospect(s). This cannot be undone.`
      : 'This cannot be undone.'

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-stone-400 hover:text-red-600 flex-shrink-0"
        onClick={handleDelete}
        disabled={busy}
      >
        {busy ? '…' : <Trash2 className="h-4 w-4" />}
      </Button>

      <ConfirmModal
        open={showConfirm}
        title="Delete this scrub session?"
        description={confirmDescription}
        confirmLabel="Delete"
        variant="danger"
        loading={busy}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
