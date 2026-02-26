'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SaveState } from '@/lib/save-state/model'

type GuardOptions = {
  isDirty: boolean
  onSaveDraft?: () => Promise<void> | void
  canSaveDraft?: boolean
  saveState: SaveState
}

function canLeaveWithoutPrompt(isDirty: boolean, saveState: SaveState) {
  if (!isDirty) return true
  return saveState.status === 'SAVED' || saveState.status === 'OFFLINE_QUEUED'
}

export function useUnsavedChangesGuard({
  isDirty,
  onSaveDraft,
  canSaveDraft = false,
  saveState,
}: GuardOptions) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const pendingNavigationRef = useRef<(() => void) | null>(null)
  const allowNextPopRef = useRef(false)

  const shouldGuard = !canLeaveWithoutPrompt(isDirty, saveState)

  const requestNavigation = useCallback(
    (navigation: () => void) => {
      if (!shouldGuard) {
        navigation()
        return
      }
      pendingNavigationRef.current = navigation
      setOpen(true)
    },
    [shouldGuard]
  )

  const handleStay = useCallback(() => {
    setOpen(false)
    pendingNavigationRef.current = null
  }, [])

  const handleLeave = useCallback(() => {
    const navigation = pendingNavigationRef.current
    pendingNavigationRef.current = null
    setOpen(false)
    navigation?.()
  }, [])

  const handleSaveDraftAndLeave = useCallback(async () => {
    if (!onSaveDraft || !canSaveDraft) return
    await onSaveDraft()
    handleLeave()
  }, [canSaveDraft, handleLeave, onSaveDraft])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldGuard) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [shouldGuard])

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!shouldGuard) return
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target === '_blank') return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return

      if (/^https?:\/\//i.test(href)) {
        const url = new URL(href)
        if (url.origin !== window.location.origin) return
        event.preventDefault()
        requestNavigation(() => router.push(`${url.pathname}${url.search}${url.hash}`))
        return
      }

      event.preventDefault()
      requestNavigation(() => router.push(href))
    }

    document.addEventListener('click', onDocumentClick, true)
    return () => document.removeEventListener('click', onDocumentClick, true)
  }, [requestNavigation, router, shouldGuard])

  useEffect(() => {
    const onPopState = () => {
      if (!shouldGuard) return
      if (allowNextPopRef.current) {
        allowNextPopRef.current = false
        return
      }

      history.go(1)
      pendingNavigationRef.current = () => {
        allowNextPopRef.current = true
        history.back()
      }
      setOpen(true)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [shouldGuard])

  return useMemo(
    () => ({
      open,
      requestNavigation,
      onStay: handleStay,
      onLeave: handleLeave,
      onSaveDraftAndLeave: handleSaveDraftAndLeave,
      canSaveDraft: Boolean(onSaveDraft && canSaveDraft),
    }),
    [
      canSaveDraft,
      handleLeave,
      handleSaveDraftAndLeave,
      handleStay,
      onSaveDraft,
      open,
      requestNavigation,
    ]
  )
}
