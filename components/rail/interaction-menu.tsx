'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface InteractionMenuProps {
  itemKey: string
  userId: string
  tenantId: string
  role: string
  className?: string
  onAction?: (action: string) => void
}

const ACTIONS = [
  { key: 'snooze_1h', label: 'Snooze 1h', type: 'snooze' as const },
  { key: 'snooze_24h', label: 'Snooze 24h', type: 'snooze' as const },
  { key: 'until_resolved', label: 'Until resolved', type: 'snooze' as const },
  { key: 'save', label: 'Save', type: 'save' as const },
  { key: 'permanent', label: 'Dismiss', type: 'dismiss' as const },
] as const

export function InteractionMenu({
  itemKey,
  userId,
  tenantId,
  role,
  className,
  onAction,
}: InteractionMenuProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleAction = (action: (typeof ACTIONS)[number]) => {
    startTransition(async () => {
      try {
        const { dismissRailItemAction, saveRailItemAction } =
          await import('@/lib/discovery/universal-rail-actions')

        if (action.type === 'save') {
          await saveRailItemAction(userId, tenantId, itemKey, role)
        } else {
          const dismissType = action.key as
            | 'snooze_1h'
            | 'snooze_24h'
            | 'until_resolved'
            | 'permanent'
          await dismissRailItemAction(userId, tenantId, itemKey, role, dismissType)
        }

        onAction?.(action.key)
        setOpen(false)
      } catch {
        // TODO: rollback toast when toast system is wired
      }
    })
  }

  return (
    <div ref={menuRef} className={cn('relative flex-shrink-0', className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setOpen(!open)
        }}
        disabled={isPending}
        className={cn(
          'flex items-center justify-center w-6 h-6 rounded-md transition-all',
          'bg-stone-800/60 hover:bg-stone-700/80 text-stone-400 hover:text-stone-200',
          'border border-stone-700/50',
          isPending && 'opacity-50 pointer-events-none'
        )}
        aria-label="Rail item actions"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="3" cy="7" r="1.2" />
          <circle cx="7" cy="7" r="1.2" />
          <circle cx="11" cy="7" r="1.2" />
        </svg>
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-1 z-50 min-w-[140px]',
            'bg-stone-900 border border-stone-700/60 rounded-lg shadow-xl',
            'py-1'
          )}
        >
          {ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleAction(action)
              }}
              disabled={isPending}
              className={cn(
                'w-full px-3 py-1.5 text-left text-xs transition-colors',
                action.key === 'permanent'
                  ? 'text-red-400 hover:bg-red-950/40'
                  : 'text-stone-300 hover:bg-stone-800',
                isPending && 'opacity-50'
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
