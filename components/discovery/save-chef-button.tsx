'use client'

import { useState, useTransition } from 'react'
import { toggleSaveChef } from '@/lib/discovery/saved-chefs'
import { trackDiscoveryChefSave } from '@/lib/discovery/track-discovery-click'

interface SaveChefButtonProps {
  chefId: string
  initialSaved: boolean
  className?: string
}

export function SaveChefButton({ chefId, initialSaved, className }: SaveChefButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const optimisticSaved = !saved
    setSaved(optimisticSaved)

    startTransition(async () => {
      try {
        const result = await toggleSaveChef(chefId)
        setSaved(result.saved)
        trackDiscoveryChefSave({ chefId, saved: result.saved })
      } catch {
        // Revert on error
        setSaved(saved)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={saved ? 'Remove saved chef' : 'Save chef'}
      className={[
        'bg-transparent border-0 p-1 leading-none',
        isPending ? 'cursor-wait' : 'cursor-pointer',
        className ?? '',
      ].join(' ')}
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          isPending
            ? 'opacity-50 transition-opacity duration-150'
            : 'opacity-100 transition-opacity duration-150'
        }
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}
