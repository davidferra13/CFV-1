'use client'

import { useState, useTransition } from 'react'
import { updateMemberNotificationPreferences } from '@/lib/hub/group-actions'

interface RemyCircleToggleProps {
  groupId: string
  profileToken: string
  initialValue: boolean
}

/**
 * Per-member toggle to show/hide Remy AI messages in a circle.
 */
export function RemyCircleToggle({ groupId, profileToken, initialValue }: RemyCircleToggleProps) {
  const [showRemy, setShowRemy] = useState(initialValue)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    const newValue = !showRemy
    setShowRemy(newValue) // Optimistic

    startTransition(async () => {
      try {
        const result = await updateMemberNotificationPreferences({
          groupId,
          profileToken,
          prefs: { show_remy: newValue },
        })
        if (!result.success) {
          setShowRemy(!newValue) // Rollback
        }
      } catch {
        setShowRemy(!newValue) // Rollback
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        showRemy
          ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50'
          : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
      }`}
      title={showRemy ? 'Remy AI is active in this circle' : 'Remy AI is hidden in this circle'}
    >
      <span className="text-base">{showRemy ? '🐀' : '🚫'}</span>
      <span>{showRemy ? 'Remy Active' : 'Remy Hidden'}</span>
      <div
        className={`ml-auto h-5 w-9 rounded-full p-0.5 transition-colors ${
          showRemy ? 'bg-amber-600' : 'bg-stone-600'
        }`}
      >
        <div
          className={`h-4 w-4 rounded-full bg-white transition-transform ${
            showRemy ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  )
}
