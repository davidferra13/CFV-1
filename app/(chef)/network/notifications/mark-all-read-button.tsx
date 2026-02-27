'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { markSocialNotificationsRead } from '@/lib/social/chef-social-actions'
import { Button } from '@/components/ui/button'

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await markSocialNotificationsRead()
            toast.success('All notifications marked as read')
          } catch {
            toast.error('Failed to mark notifications as read')
          }
        })
      }
      className="text-sm px-3 py-1.5 h-auto"
    >
      {pending ? 'Marking...' : 'Mark all read'}
    </Button>
  )
}
