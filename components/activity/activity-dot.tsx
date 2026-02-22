'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { ChefActivityEntry } from '@/lib/activity/chef-types'
import { DOMAIN_CONFIG } from '@/lib/activity/chef-types'

interface ActivityDotProps {
  collapsed?: boolean
}

export function ActivityDot({ collapsed }: ActivityDotProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ChefActivityEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (loaded) return
    try {
      const res = await fetch('/api/activity/feed?tab=my&timeRange=7&limit=5', {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setItems(data.chefItems || [])
      }
    } catch {
      // non-blocking
    }
    setLoaded(true)
  }, [loaded])

  function handleClick() {
    if (!open) void load()
    setOpen((prev) => !prev)
  }

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return

    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Recent activity"
        title="Recent activity"
        className={`flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-50 hover:text-stone-600 transition-colors ${
          collapsed ? 'w-10 h-10' : 'w-8 h-8 p-1.5'
        }`}
      >
        {/* Tiny dot — quiet, always there */}
        <span className="relative flex items-center justify-center w-4 h-4">
          <span className="block w-2 h-2 rounded-full bg-emerald-500/80" />
        </span>
      </button>

      {open && (
        <div
          className={`absolute z-50 bg-white rounded-lg shadow-lg border border-stone-200 w-72 ${
            collapsed ? 'left-full ml-2 top-0' : 'left-0 top-full mt-1'
          }`}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100">
            <span className="text-xs font-medium text-stone-600">Recent Activity</span>
            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              className="text-[10px] font-medium text-brand-600 hover:text-brand-700"
            >
              View all
            </Link>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5">
            {!loaded && <div className="text-xs text-stone-400 text-center py-4">Loading...</div>}
            {loaded && items.length === 0 && (
              <div className="text-xs text-stone-400 text-center py-4">No recent activity</div>
            )}
            {items.map((entry) => {
              const config = DOMAIN_CONFIG[entry.domain] || DOMAIN_CONFIG.operational
              const href = getEntityHref(entry)
              const row = (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-stone-50 transition-colors"
                >
                  <span
                    className={`text-[9px] font-medium px-1 py-0.5 rounded shrink-0 mt-0.5 ${config.bgColor} ${config.color}`}
                  >
                    {config.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-stone-700 leading-snug line-clamp-2">
                      {entry.summary}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {formatTimeAgo(entry.created_at)}
                    </p>
                  </div>
                </div>
              )
              if (href) {
                return (
                  <Link key={entry.id} href={href} onClick={() => setOpen(false)} className="block">
                    {row}
                  </Link>
                )
              }
              return row
            })}
          </div>

          <div className="border-t border-stone-100 px-3 py-2">
            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-stone-500 hover:text-stone-700"
            >
              Open full timeline
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function getEntityHref(entry: ChefActivityEntry): string | null {
  const id = entry.entity_id
  if (!id) return null
  switch (entry.entity_type) {
    case 'event':
      return `/pipeline/events/${id}`
    case 'inquiry':
      return `/pipeline/inquiries/${id}`
    case 'quote':
      return `/pipeline/quotes/${id}`
    case 'menu':
      return `/culinary/menus/${id}`
    case 'recipe':
      return `/culinary/recipes/${id}`
    case 'client':
      return `/clients/${id}`
    default:
      return null
  }
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const ms = now.getTime() - d.getTime()
  const mins = Math.floor(ms / 60000)
  const hrs = Math.floor(ms / 3600000)
  const days = Math.floor(ms / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
