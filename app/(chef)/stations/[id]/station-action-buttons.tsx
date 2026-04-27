'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { removeMenuItemFromStation, removeComponent } from '@/lib/stations/actions'

export function RemoveMenuItemButton({ menuItemId }: { menuItemId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-stone-400"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await removeMenuItemFromStation(menuItemId)
            toast.success('Menu item removed')
            router.refresh()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to remove menu item')
          }
        })
      }}
    >
      {pending ? 'Removing...' : 'Remove'}
    </Button>
  )
}

export function RemoveComponentButton({ componentId }: { componentId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-stone-500 text-xs"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await removeComponent(componentId)
            toast.success('Component removed')
            router.refresh()
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to remove component')
          }
        })
      }}
    >
      {pending ? 'Removing...' : 'Remove'}
    </Button>
  )
}
