'use client'

import { useTransition } from 'react'
import { markSocialNotificationsRead } from '@/lib/social/chef-social-actions'
import { Button } from '@/components/ui/button'

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => startTransition(async () => { await markSocialNotificationsRead() })}
      className="text-sm px-3 py-1.5 h-auto"
    >
      {pending ? 'Marking...' : 'Mark all read'}
    </Button>
  )
}
