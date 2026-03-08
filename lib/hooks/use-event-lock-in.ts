'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { lockInToEvent, unlockEvent } from '@/lib/chef/actions'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'chef-locked-event'

type LockInState = {
  eventId: string
  eventTitle: string | null
  eventDate: string | null
} | null

/**
 * Client-side hook for event lock-in state.
 * Reads from server props (SSR) and mirrors to localStorage (flash-free hydration).
 */
export function useEventLockIn(
  serverEventId: string | null,
  serverEventTitle: string | null,
  serverEventDate: string | null
) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lockIn, setLockIn] = useState<LockInState>(() => {
    // Initialize from server props
    if (serverEventId) {
      return {
        eventId: serverEventId,
        eventTitle: serverEventTitle,
        eventDate: serverEventDate,
      }
    }
    return null
  })

  // Sync localStorage on mount for flash-free hydration on subsequent navigations
  useEffect(() => {
    if (serverEventId) {
      const state: LockInState = {
        eventId: serverEventId,
        eventTitle: serverEventTitle,
        eventDate: serverEventDate,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      setLockIn(state)
    } else {
      localStorage.removeItem(STORAGE_KEY)
      setLockIn(null)
    }
  }, [serverEventId, serverEventTitle, serverEventDate])

  const doLockIn = useCallback(
    (eventId: string, eventTitle?: string, eventDate?: string) => {
      // Optimistic update
      const optimistic: LockInState = {
        eventId,
        eventTitle: eventTitle ?? null,
        eventDate: eventDate ?? null,
      }
      const previous = lockIn
      setLockIn(optimistic)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(optimistic))

      startTransition(async () => {
        try {
          await lockInToEvent(eventId)
          router.refresh()
        } catch {
          // Rollback
          setLockIn(previous)
          if (previous) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(previous))
          } else {
            localStorage.removeItem(STORAGE_KEY)
          }
        }
      })
    },
    [lockIn, router]
  )

  const doUnlock = useCallback(() => {
    const previous = lockIn
    setLockIn(null)
    localStorage.removeItem(STORAGE_KEY)

    startTransition(async () => {
      try {
        await unlockEvent()
        router.refresh()
      } catch {
        // Rollback
        setLockIn(previous)
        if (previous) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(previous))
        }
      }
    })
  }, [lockIn, router])

  return {
    isLockedIn: !!lockIn,
    lockedEventId: lockIn?.eventId ?? null,
    lockedEventTitle: lockIn?.eventTitle ?? null,
    lockedEventDate: lockIn?.eventDate ?? null,
    lockIn: doLockIn,
    unlock: doUnlock,
    isPending,
  }
}
