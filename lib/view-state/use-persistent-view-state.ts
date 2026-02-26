'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReadonlyURLSearchParams } from 'next/navigation'

type Strategy = 'url' | 'local' | 'server'

type PersistOptions<T extends Record<string, unknown>> = {
  strategy: Strategy
  defaults: T
}

type PersistResult<T extends Record<string, unknown>> = {
  state: T
  setState: (patch: Partial<T> | ((prev: T) => T)) => void
  reset: () => void
}

function decodeByDefault(defaultValue: unknown, raw: string): unknown {
  if (typeof defaultValue === 'boolean') {
    return raw === 'true' || raw === '1'
  }
  if (typeof defaultValue === 'number') {
    const value = Number(raw)
    return Number.isFinite(value) ? value : defaultValue
  }
  if (Array.isArray(defaultValue)) {
    if (!raw.trim()) return []
    return raw.split(',').map((part) => part.trim())
  }
  return raw
}

function encodeValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(',')
  }
  return String(value)
}

function readStoredState<T extends Record<string, unknown>>(
  scopeKey: string,
  defaults: T
): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`cf:view:last:${scopeKey}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<T>
    return { ...defaults, ...parsed }
  } catch {
    return null
  }
}

function parseStateFromParams<T extends Record<string, unknown>>(
  defaults: T,
  params: URLSearchParams | ReadonlyURLSearchParams | null
): T {
  const next = { ...defaults }
  const parsedParams = params ?? new URLSearchParams()
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const raw = parsedParams.get(key)
    if (raw === null) continue
    ;(next as Record<string, unknown>)[key] = decodeByDefault(defaultValue, raw)
  }
  return next
}

export function usePersistentViewState<T extends Record<string, unknown>>(
  scopeKey: string,
  options: PersistOptions<T>
): PersistResult<T> {
  const { strategy, defaults } = options
  const router = useRouter()
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()
  const lastScrollWriteRef = useRef(0)

  const urlInitial = useMemo(() => {
    if (strategy !== 'url') return defaults
    const fallbackStored = readStoredState(scopeKey, defaults)
    const next = parseStateFromParams(defaults, searchParams)
    const hasExplicitParam = Array.from(searchParams?.keys() ?? []).length > 0
    if (!hasExplicitParam && fallbackStored) {
      return fallbackStored
    }
    return next
  }, [defaults, scopeKey, searchParams, strategy])

  const [state, setStateInternal] = useState<T>(() => {
    if (strategy === 'url') return urlInitial

    const fallback = readStoredState(scopeKey, defaults)
    if (fallback) return fallback

    if (typeof window === 'undefined') return defaults
    try {
      const raw = localStorage.getItem(`cf:view:${scopeKey}`)
      if (!raw) return defaults
      const parsed = JSON.parse(raw) as Partial<T>
      return { ...defaults, ...parsed }
    } catch {
      return defaults
    }
  })

  const setState = useCallback(
    (patch: Partial<T> | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        if (typeof patch === 'function') {
          return patch(prev)
        }
        return { ...prev, ...patch }
      })
    },
    [setStateInternal]
  )

  const reset = useCallback(() => {
    setStateInternal(defaults)
  }, [defaults])

  // Sync local state when URL changes through browser back/forward or deep links.
  useEffect(() => {
    if (strategy !== 'url') return
    const next = parseStateFromParams(defaults, searchParams)
    setStateInternal((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(next)) return prev
      return next
    })
  }, [defaults, searchParams, strategy])

  // Keep local/server strategy persisted in legacy localStorage key.
  useEffect(() => {
    if (strategy === 'url') return
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`cf:view:${scopeKey}`, JSON.stringify(state))
    } catch {
      // non-blocking
    }
  }, [scopeKey, state, strategy])

  // Persist last known state for all strategies so other surfaces
  // (like global search deep links) can reconstruct context.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(`cf:view:last:${scopeKey}`, JSON.stringify(state))
    } catch {
      // non-blocking
    }
  }, [scopeKey, state])

  // Sync URL from state.
  useEffect(() => {
    if (strategy !== 'url') return

    const params = new URLSearchParams(searchParams?.toString() ?? '')
    for (const [key, defaultValue] of Object.entries(defaults)) {
      const value = (state as Record<string, unknown>)[key]
      if (value === defaultValue || value === undefined || value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, encodeValue(value))
      }
    }

    const query = params.toString()
    const href = query ? `${pathname}?${query}` : pathname
    const current = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`
    if (href !== current) {
      router.replace(href, { scroll: false })
    }
  }, [defaults, pathname, router, searchParams, state, strategy])

  // Track and restore scroll position per scope for back/forward UX.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = `cf:view:scroll:${scopeKey}`
    try {
      const raw = sessionStorage.getItem(key)
      if (raw) {
        const y = Number(raw)
        if (Number.isFinite(y) && y > 0) {
          window.requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'auto' }))
        }
      }
    } catch {
      // non-blocking
    }

    const writeScroll = () => {
      const now = Date.now()
      if (now - lastScrollWriteRef.current < 150) return
      lastScrollWriteRef.current = now
      try {
        sessionStorage.setItem(key, String(window.scrollY || 0))
      } catch {
        // non-blocking
      }
    }

    const onBeforeUnload = () => writeScroll()
    const onScroll = () => writeScroll()

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      writeScroll()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [scopeKey])

  return {
    state,
    setState,
    reset,
  }
}
