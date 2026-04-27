'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { contactWaitlistEntry, expireWaitlistEntry } from '@/lib/availability/actions'

export function MarkContactedButton({ entryId }: { entryId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await contactWaitlistEntry(entryId)
            toast.success('Marked as contacted')
            router.refresh()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update')
          }
        })
      }}
    >
      {pending ? 'Updating...' : 'Mark Contacted'}
    </Button>
  )
}

export function ExpireButton({ entryId }: { entryId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="text-stone-400"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await expireWaitlistEntry(entryId)
            toast.success('Entry expired')
            router.refresh()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to expire entry')
          }
        })
      }}
    >
      {pending ? 'Expiring...' : 'Expire'}
    </Button>
  )
}
