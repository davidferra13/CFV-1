'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toggleSequence } from '@/lib/marketing/actions'

export function SequenceToggleButton({
  sequenceId,
  isActive,
}: {
  sequenceId: string
  isActive: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    try {
      await toggleSequence(sequenceId, !isActive)
      router.refresh()
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={isActive ? 'ghost' : 'secondary'}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="shrink-0"
    >
      {loading ? '…' : isActive ? 'Pause' : 'Activate'}
    </Button>
  )
}
