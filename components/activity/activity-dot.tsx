'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ActivityTimestamp } from '@/components/ui/activity-timestamp'
import type { ChefActivityEntry } from '@/lib/activity/chef-types'
import { DOMAIN_CONFIG } from '@/lib/activity/chef-types'
import { getChefActivityEntityHref } from '@/lib/activity/entity-routes'

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
        className={`flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-800 hover:text-stone-400 transition-colors ${
          collapsed ? 'w-10 h-10' : 'w-8 h-8 p-1.5'
        }`}
      >
        {/* Tiny dot - quiet, always there */}
        <span className="relative flex items-center justify-center w-4 h-4">
          <span className="block w-2 h-2 rounded-full bg-emerald-500/80" />
        </span>
      </button>

      {open && (
        <div
          className={`absolute z-50 bg-stone-900 rounded-lg shadow-lg border border-stone-700 w-72 ${
            collapsed ? 'left-full ml-2 top-0' : 'left-0 top-full mt-1'
          }`}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-stone-800">
            <span className="text-xs font-medium text-stone-400">Recent Activity</span>
            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              className="text-xxs font-medium text-brand-500 hover:text-brand-400"
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
              const href = getChefActivityEntityHref(entry.entity_type, entry.entity_id)
              const row = (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-stone-800 transition-colors"
                >
                  <span
                    className={`text-2xs font-medium px-1 py-0.5 rounded shrink-0 mt-0.5 ${config.bgColor} ${config.color}`}
                  >
                    {config.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-stone-300 leading-snug line-clamp-2">
                      {entry.summary}
                    </p>
                    <ActivityTimestamp
                      at={entry.created_at}
                      className="block text-xxs text-stone-400 mt-0.5"
                    />
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

          <div className="border-t border-stone-800 px-3 py-2">
            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-stone-500 hover:text-stone-300"
            >
              Open full timeline
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
