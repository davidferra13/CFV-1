'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import {
  getGuestDetailVisibility,
  toggleGuestDetailVisibility,
} from '@/lib/sharing/guest-detail-actions'

export function GuestDetailVisibilityToggle() {
  const [visible, setVisible] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(() => {
      void (async () => {
        try {
          setVisible(await getGuestDetailVisibility())
          setIsReady(true)
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to load guest privacy')
        }
      })()
    })
  }, [])

  function handleChange(next: boolean) {
    setVisible(next)
    startTransition(() => {
      void (async () => {
        try {
          await toggleGuestDetailVisibility(next)
          toast.success(
            next ? 'Host guest details are visible' : 'Host guest details are hidden'
          )
        } catch (error) {
          setVisible((current) => !current)
          toast.error(error instanceof Error ? error.message : 'Failed to update guest privacy')
        }
      })()
    })
  }

  if (!isReady) {
    return <p className="text-xs text-stone-500">Loading guest privacy...</p>
  }

  return (
    <label className="flex items-center gap-2 text-sm text-stone-300">
      <span>Show guest details to host</span>
      <Switch checked={visible} onCheckedChange={handleChange} disabled={isPending} />
    </label>
  )
}
