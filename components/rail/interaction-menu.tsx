'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface InteractionMenuProps {
  itemKey: string
  tenantId: string
  userId: string
  href?: string
  onAction?: (action: string) => void
}

export function InteractionMenu({
  itemKey,
  tenantId,
  userId,
  href,
  onAction,
}: InteractionMenuProps) {
  const [showOverflow, setShowOverflow] = useState(false)
  const [isPending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowOverflow(false)
      }
    }
    if (showOverflow) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showOverflow])

  const handleAction = (action: string) => {
    startTransition(async () => {
      try {
        switch (action) {
          case 'act':
            if (href) window.location.href = href
            break
          case 'snooze': {
            const { snoozeItem } = await import('@/lib/rail/state')
            await snoozeItem(tenantId, userId, itemKey, 60)
            break
          }
          case 'delegate': {
            const { delegateItem } = await import('@/lib/rail/state')
            await delegateItem(tenantId, userId, itemKey, userId)
            break
          }
          case 'save': {
            const { saveItem } = await import('@/lib/rail/state')
            await saveItem(tenantId, userId, itemKey)
            break
          }
          case 'note': {
            const { addNote } = await import('@/lib/rail/state')
            await addNote(tenantId, userId, itemKey, '')
            break
          }
          case 'follow_up': {
            const { scheduleFollowUp } = await import('@/lib/rail/state')
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(9, 0, 0, 0)
            await scheduleFollowUp(tenantId, userId, itemKey, tomorrow)
            break
          }
        }
        onAction?.(action)
        setShowOverflow(false)
      } catch {
        // Non-critical action failure
      }
    })
  }

  const btnClass = cn(
    'px-2.5 py-1 text-xs font-medium rounded-md transition-all',
    'bg-stone-800/60 hover:bg-stone-700/80 text-stone-200',
    'border border-stone-700/50',
    isPending && 'opacity-50 pointer-events-none'
  )

  return (
    <div ref={menuRef} className="relative flex items-center gap-1">
      {/* Primary actions (3 visible) */}
      <button onClick={() => handleAction('act')} className={btnClass}>
        Act
      </button>
      <button onClick={() => handleAction('snooze')} className={btnClass}>
        Snooze
      </button>
      <button onClick={() => handleAction('delegate')} className={btnClass}>
        Delegate
      </button>

      {/* Overflow toggle */}
      <button
        onClick={() => setShowOverflow(!showOverflow)}
        className={cn(btnClass, 'px-1.5')}
        aria-label="More actions"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="3" cy="7" r="1.2" />
          <circle cx="7" cy="7" r="1.2" />
          <circle cx="11" cy="7" r="1.2" />
        </svg>
      </button>

      {/* Overflow dropdown */}
      {showOverflow && (
        <div
          className={cn(
            'absolute right-0 top-full mt-1 z-50 min-w-[120px]',
            'bg-stone-900 border border-stone-700/60 rounded-lg shadow-xl',
            'py-1'
          )}
        >
          <button
            onClick={() => handleAction('save')}
            className="w-full px-3 py-1.5 text-left text-xs text-stone-300 hover:bg-stone-800 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => handleAction('note')}
            className="w-full px-3 py-1.5 text-left text-xs text-stone-300 hover:bg-stone-800 transition-colors"
          >
            Add Note
          </button>
          <button
            onClick={() => handleAction('follow_up')}
            className="w-full px-3 py-1.5 text-left text-xs text-stone-300 hover:bg-stone-800 transition-colors"
          >
            Follow Up
          </button>
        </div>
      )}
    </div>
  )
}
