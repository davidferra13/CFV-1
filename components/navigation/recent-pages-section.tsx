// Recently Visited Pages — collapsible sidebar section
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Clock, X } from 'lucide-react'
import { useRecentPages, type RecentPage } from '@/hooks/use-recent-pages'

const COLLAPSED_KEY = 'cf:recent-collapsed'

/**
 * Simple relative time formatter — avoids importing date-fns.
 * Returns "just now", "2m", "1h", "3d", "2w", "1mo", etc.
 */
function relativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then

  if (diffMs < 0 || Number.isNaN(diffMs)) return 'just now'

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`

  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w`

  const months = Math.floor(days / 30)
  return `${months}mo`
}

export function RecentPagesSection() {
  const router = useRouter()
  const { recentPages, clearHistory } = useRecentPages()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_KEY)
      if (stored === 'true') setCollapsed(true)
    } catch {
      // ignore
    }
    setMounted(true)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  // Don't render until mounted (avoid hydration mismatch with localStorage)
  if (!mounted) return null

  // Don't render when there are no recent pages
  if (recentPages.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          className="group flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-stone-300 hover:bg-stone-800"
        >
          <Clock className="w-4 h-4 text-stone-500" />
          <span className="flex-1 text-left">Recent</span>
          {collapsed ? (
            <ChevronUp className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          )}
        </button>
        {!collapsed && recentPages.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="text-stone-500 hover:text-stone-300 transition-colors p-1 rounded-md"
            title="Clear recent pages"
            aria-label="Clear recent pages"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          collapsed ? 'max-h-0 opacity-0' : 'max-h-[420px] opacity-100'
        }`}
      >
        <div className="space-y-0.5">
          {recentPages.map((page: RecentPage) => (
            <button
              key={page.path}
              type="button"
              onClick={() => router.push(page.path)}
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm font-medium text-stone-400 hover:bg-stone-800 hover:text-stone-100 transition-colors text-left"
            >
              <span className="flex-1 truncate">{page.label}</span>
              <span className="text-[10px] text-stone-500 flex-shrink-0 tabular-nums">
                {relativeTime(page.visitedAt)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
