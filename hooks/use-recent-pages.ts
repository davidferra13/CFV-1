// Recently visited pages hook — tracks last 8 page visits in localStorage
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'cf:recent-pages'
const MAX_PAGES = 8

/** Paths that should never appear in the recent pages list */
const EXCLUDED_PREFIXES = ['/settings', '/api']

export type RecentPage = {
  path: string
  label: string
  visitedAt: string
}

/** UUID v4 pattern — matches 8-4-4-4-12 hex strings */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Derive a human-readable label from a pathname.
 *
 * Static paths get title-cased segment labels:
 *   /clients → "Clients"
 *   /events/new → "New Event"
 *
 * Dynamic segments (UUIDs) get a generic "Detail" label:
 *   /clients/abc-123 → "Client Detail"
 *   /events/abc-123  → "Event Detail"
 */
function deriveLabel(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return 'Home'

  // Check if the last segment is a UUID (dynamic route)
  const lastSegment = segments[segments.length - 1]
  if (UUID_RE.test(lastSegment)) {
    // Use the parent segment to name the detail page
    const parent = segments.length >= 2 ? segments[segments.length - 2] : 'Page'
    // Singularize common plurals
    const singular = singularize(parent)
    return `${titleCase(singular)} Detail`
  }

  // Static path label derivation
  // If path has a final "action" segment like /new, /edit — use "Action Parent"
  const actionSegments = ['new', 'edit', 'create']
  if (segments.length >= 2 && actionSegments.includes(lastSegment)) {
    const parent = segments[segments.length - 2]
    const singular = singularize(parent)
    return `${titleCase(lastSegment)} ${titleCase(singular)}`
  }

  // Default: title-case the last segment
  return titleCase(lastSegment)
}

function titleCase(str: string): string {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function singularize(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.endsWith('ses')) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

function readFromStorage(): RecentPage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function writeToStorage(pages: RecentPage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function useRecentPages() {
  const pathname = usePathname() ?? ''
  const [recentPages, setRecentPages] = useState<RecentPage[]>([])
  const lastTrackedRef = useRef<string>('')

  // Load from localStorage on mount
  useEffect(() => {
    setRecentPages(readFromStorage())
  }, [])

  const trackPage = useCallback((path: string) => {
    if (!path) return
    // Exclude filtered paths
    if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) return

    setRecentPages((prev) => {
      // Remove any existing entry for this path (dedup)
      const filtered = prev.filter((p) => p.path !== path)

      const entry: RecentPage = {
        path,
        label: deriveLabel(path),
        visitedAt: new Date().toISOString(),
      }

      // Prepend (most recent first), cap at MAX_PAGES
      const updated = [entry, ...filtered].slice(0, MAX_PAGES)
      writeToStorage(updated)
      return updated
    })
  }, [])

  const clearHistory = useCallback(() => {
    setRecentPages([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  // Auto-track on pathname change
  useEffect(() => {
    if (pathname && pathname !== lastTrackedRef.current) {
      lastTrackedRef.current = pathname
      trackPage(pathname)
    }
  }, [pathname, trackPage])

  return { recentPages, trackPage, clearHistory }
}
