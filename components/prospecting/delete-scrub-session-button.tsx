'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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

  async function handleDelete() {
    const msg =
      prospectCount > 0
        ? `Delete this scrub session and its ${prospectCount} prospect(s)?`
        : 'Delete this scrub session?'
    if (!confirm(msg)) return
    setBusy(true)
    try {
      await deleteScrubSession(sessionId)
      router.refresh()
    } catch {
      alert('Failed to delete session.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-stone-400 hover:text-red-600 flex-shrink-0"
      onClick={handleDelete}
      disabled={busy}
    >
      {busy ? '…' : <Trash2 className="h-4 w-4" />}
    </Button>
  )
}
