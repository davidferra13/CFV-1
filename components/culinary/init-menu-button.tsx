'use client'

// InitMenuButton - Creates a draft menu pre-populated with event context
// Used on event detail pages when no menu is attached yet

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { initializeMenuForEvent } from '@/lib/menus/menu-intelligence-actions'

interface InitMenuButtonProps {
  eventId: string
  hasMenu: boolean
  className?: string
}

export function InitMenuButton({ eventId, hasMenu, className = '' }: InitMenuButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (hasMenu) return null

  function handleInit() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await initializeMenuForEvent(eventId)
        if (result.success) {
          router.push(`/culinary/menus/${result.menuId}`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create menu')
      }
    })
  }

  return (
    <div className={className}>
      <Button variant="primary" size="sm" onClick={handleInit} disabled={isPending}>
        {isPending ? 'Creating menu...' : 'Create Menu'}
      </Button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
