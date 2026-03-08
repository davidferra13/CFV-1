'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { rebookClient } from '@/lib/clients/rebook-actions'

interface RebookButtonProps {
  clientId: string
  clientName: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'default'
  className?: string
}

export function RebookButton({
  clientId,
  clientName,
  variant = 'secondary',
  size = 'sm',
  className,
}: RebookButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRebook() {
    startTransition(async () => {
      try {
        const result = await rebookClient(clientId)
        if (result.success && result.eventId) {
          router.push(`/events/${result.eventId}/edit`)
        } else {
          // No completed events found, fall back to new event form
          router.push(`/events/new?client_id=${clientId}`)
        }
      } catch (err) {
        console.error('[RebookButton] Failed:', err)
        router.push(`/events/new?client_id=${clientId}`)
      }
    })
  }

  return (
    <Button
      variant={variant}
      size={size}
      disabled={isPending}
      onClick={handleRebook}
      className={className}
    >
      {isPending ? 'Creating...' : 'Rebook'}
    </Button>
  )
}
