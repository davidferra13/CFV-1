'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ContextualRailData } from '@/lib/discovery/contextual-rail-types'
import { useSSE } from '@/lib/realtime/sse-client'
import { cn } from '@/lib/utils'
import { CollapsedBar } from './collapsed-bar'
import { ExpandedPanel } from './expanded-panel'

function getStorageKey(profileId: string) {
  return `rail-expanded-${profileId}`
}

function readExpanded(profileId: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = localStorage.getItem(getStorageKey(profileId))
    if (stored === null) return fallback
    return stored === '1'
  } catch {
    return fallback
  }
}

function writeExpanded(profileId: string, value: boolean) {
  try {
    localStorage.setItem(getStorageKey(profileId), value ? '1' : '0')
  } catch {
    // localStorage unavailable
  }
}

export function ContextualRailClient({ data }: { data: ContextualRailData }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(() =>
    readExpanded(data.profile.id, data.profile.defaultExpanded)
  )

  // Persist expand/collapse preference
  useEffect(() => {
    writeExpanded(data.profile.id, expanded)
  }, [expanded, data.profile.id])

  // SSE subscription: re-render on rail messages
  useSSE('rail', {
    onMessage: useCallback(() => {
      router.refresh()
    }, [router]),
  })

  // Keyboard shortcut: 'r' toggles expand/collapse
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'r') return
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if ((e.target as HTMLElement)?.isContentEditable) return
      e.preventDefault()
      setExpanded((prev) => !prev)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (data.totalItems === 0) return null

  return (
    <div
      data-cf-contextual-rail={data.profile.id}
      data-cf-contextual-rail-state={expanded ? 'expanded' : 'collapsed'}
      className={cn(
        'overflow-hidden transition-all duration-200 ease-out',
        expanded ? 'max-h-[320px]' : 'max-h-9'
      )}
    >
      {expanded ? (
        <ExpandedPanel data={data} onCollapse={() => setExpanded(false)} />
      ) : (
        <CollapsedBar data={data} onExpand={() => setExpanded(true)} />
      )}
    </div>
  )
}
