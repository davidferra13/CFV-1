'use client'

import { useEffect } from 'react'

const RECOVERY_KEY = 'chefflow-chunk-recovery-attempted'
const RECOVERY_TTL_MS = 30_000 // 30 seconds - prevents infinite reload loops

export function isChunkLoadError(error: Error): boolean {
  const msg = error.message || ''
  return (
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module')
  )
}

/**
 * Unregister all service workers, clear all caches, then hard-reload to /.
 * Uses sessionStorage to prevent infinite reload loops: if we already
 * attempted recovery within the last 30 seconds, we bail and let the
 * error boundary show its fallback UI instead.
 *
 * Pass `force: true` to bypass the loop guard (for manual "Reload Now" clicks).
 */
export async function nukeServiceWorkerAndReload(opts?: { force?: boolean }): Promise<boolean> {
  // Guard against infinite loops (skipped for manual user clicks)
  if (!opts?.force) {
    try {
      const lastAttempt = sessionStorage.getItem(RECOVERY_KEY)
      if (lastAttempt) {
        const elapsed = Date.now() - parseInt(lastAttempt, 10)
        if (elapsed < RECOVERY_TTL_MS) {
          // Already tried recently, don't loop
          return false
        }
      }
      sessionStorage.setItem(RECOVERY_KEY, String(Date.now()))
    } catch {
      // sessionStorage unavailable (private browsing, etc.) - proceed anyway
    }
  }

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((r) => r.unregister()))
    }
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }
  } catch {
    // Best effort
  }

  window.location.replace('/')
  return true
}

/**
 * Hook: auto-recovers from stale chunk errors by nuking the service worker
 * and caches, then hard-reloading. Safe against infinite loops.
 *
 * Usage: add `useChunkErrorRecovery(error)` to any error boundary component.
 * Returns `isChunkError` so the boundary can show appropriate UI.
 */
export function useChunkErrorRecovery(error: Error): {
  isChunkError: boolean
  triggerRecovery: () => void
} {
  const isChunkError = isChunkLoadError(error)

  useEffect(() => {
    if (isChunkError) {
      nukeServiceWorkerAndReload()
    }
  }, [isChunkError])

  return {
    isChunkError,
    triggerRecovery: () => nukeServiceWorkerAndReload({ force: true }),
  }
}
