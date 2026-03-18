'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell } from '@/components/ui/icons'
import { useNotifications } from './notification-provider'
import { NotificationPanel } from './notification-panel'

export function NotificationBell({ collapsed = false }: { collapsed?: boolean }) {
  const { unreadCount } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return

    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        className={`relative flex items-center justify-center rounded-lg transition-colors ${
          open
            ? 'bg-stone-800 text-stone-300'
            : 'text-stone-400 hover:bg-stone-800 hover:text-stone-400'
        } ${collapsed ? 'w-11 h-11' : 'w-11 h-11'} touch-manipulation`}
      >
        <Bell className="w-[18px] h-[18px]" />

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-xxs font-bold text-white bg-red-500 rounded-full leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </div>
  )
}
