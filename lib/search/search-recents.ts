'use client'

import type { SearchResult } from '@/lib/search/universal-search'

const MAX_RECENTS = 12
const MAX_PINNED = 8

export type SearchHistoryEntry = Pick<SearchResult, 'id' | 'type' | 'title' | 'snippet' | 'url'> & {
  metadata?: Record<string, string>
  selectedAt: string
  pinned?: boolean
}

function storageKey(tenantId: string, userId: string) {
  return `cf:search:history:${tenantId}:${userId}`
}

function readAll(tenantId: string, userId: string): SearchHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(tenantId, userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as SearchHistoryEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function writeAll(tenantId: string, userId: string, entries: SearchHistoryEntry[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(tenantId, userId), JSON.stringify(entries))
  } catch {
    // non-blocking
  }
}

function dedupe(entries: SearchHistoryEntry[]): SearchHistoryEntry[] {
  const seen = new Set<string>()
  const next: SearchHistoryEntry[] = []

  for (const entry of entries) {
    const key = `${entry.id}::${entry.url}`
    if (seen.has(key)) continue
    seen.add(key)
    next.push(entry)
  }

  return next
}

export function readSearchHistory(tenantId: string, userId: string): SearchHistoryEntry[] {
  return readAll(tenantId, userId).sort(
    (a, b) => new Date(b.selectedAt).getTime() - new Date(a.selectedAt).getTime()
  )
}

export function writeRecentSearch(
  tenantId: string,
  userId: string,
  result: SearchResult,
  contextualUrl: string
): SearchHistoryEntry[] {
  const now = new Date().toISOString()
  const current = readAll(tenantId, userId)
  const existing = current.find((entry) => entry.id === result.id || entry.url === contextualUrl)

  const merged: SearchHistoryEntry = {
    id: result.id,
    type: result.type,
    title: result.title,
    snippet: result.snippet,
    url: contextualUrl,
    metadata: result.metadata,
    selectedAt: now,
    pinned: existing?.pinned ?? false,
  }

  const withEntry = dedupe([merged, ...current.filter((entry) => entry.id !== result.id)])
  const pinned = withEntry.filter((entry) => entry.pinned).slice(0, MAX_PINNED)
  const recents = withEntry.filter((entry) => !entry.pinned).slice(0, MAX_RECENTS)
  const next = [...pinned, ...recents]
  writeAll(tenantId, userId, next)
  return next
}

export function togglePinnedSearch(
  tenantId: string,
  userId: string,
  entryId: string
): SearchHistoryEntry[] {
  const current = readAll(tenantId, userId)
  const next = current.map((entry) =>
    entry.id === entryId ? { ...entry, pinned: !entry.pinned } : entry
  )
  const pinned = next.filter((entry) => entry.pinned).slice(0, MAX_PINNED)
  const recents = next.filter((entry) => !entry.pinned).slice(0, MAX_RECENTS)
  const merged = [...pinned, ...recents]
  writeAll(tenantId, userId, merged)
  return merged
}
