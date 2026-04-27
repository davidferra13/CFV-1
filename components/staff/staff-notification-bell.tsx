// Staff Notification Bell - shows unread count badge in nav
// Reads total count from server, subtracts client-side read IDs from localStorage.
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'cf-staff-read-notifications'

function getReadCount(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 0
    return (JSON.parse(raw) as string[]).length
  } catch {
    return 0
  }
}

type Props = {
  totalCount: number
}

export function StaffNotificationBell({ totalCount }: Props) {
  const pathname = usePathname() ?? ''
  const isActive = pathname === '/staff-notifications'
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const readCount = getReadCount()
    setUnreadCount(Math.max(0, totalCount - readCount))
  }, [totalCount])

  // Listen for localStorage changes (from the notifications page marking items read)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const readCount = getReadCount()
        setUnreadCount(Math.max(0, totalCount - readCount))
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [totalCount])

  return (
    <Link
      href="/staff-notifications"
      className={`relative p-2 rounded-md transition-colors ${
        isActive
          ? 'bg-stone-700 text-stone-100'
          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
      }`}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      {/* Bell SVG icon */}
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
