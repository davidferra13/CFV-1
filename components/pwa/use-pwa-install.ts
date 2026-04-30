'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'

const DISMISS_KEY = 'cf-pwa-install-prompt-dismissed'
const INSTALLED_KEY = 'cf-pwa-installed'

type BeforeInstallPromptChoice = {
  outcome: 'accepted' | 'dismissed'
  platform: string
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<BeforeInstallPromptChoice>
}

type InstallState = {
  promptEvent: BeforeInstallPromptEvent | null
  installed: boolean
}

const subscribers = new Set<(state: InstallState) => void>()
let promptEvent: BeforeInstallPromptEvent | null = null
let installed = false
let listenersAttached = false

function getStandaloneDisplay() {
  if (typeof window === 'undefined') return false

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    Boolean(navigatorWithStandalone.standalone)
  )
}

function getState(): InstallState {
  return {
    promptEvent,
    installed: installed || getStandaloneDisplay(),
  }
}

function emit() {
  const nextState = getState()
  subscribers.forEach((subscriber) => subscriber(nextState))
}

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function markDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // localStorage can be unavailable in restricted browsing modes.
  }
}

function markInstalled() {
  installed = true
  try {
    window.localStorage.setItem(INSTALLED_KEY, '1')
    window.localStorage.removeItem(DISMISS_KEY)
  } catch {
    // The app can still be installed when localStorage is unavailable.
  }
}

function isIosDevice() {
  if (typeof window === 'undefined') return false
  const userAgent = window.navigator.userAgent
  const platform = window.navigator.platform
  return (
    /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isAndroidDevice() {
  if (typeof window === 'undefined') return false
  return /Android/i.test(window.navigator.userAgent)
}

function getBrowserName() {
  if (typeof window === 'undefined') return 'Browser'
  const userAgent = window.navigator.userAgent
  if (/Edg\//.test(userAgent)) return 'Edge'
  if (/Chrome\//.test(userAgent) && !/Edg\//.test(userAgent)) return 'Chrome'
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return 'Safari'
  if (/Firefox\//.test(userAgent)) return 'Firefox'
  return 'Browser'
}

function ensureGlobalInstallListeners() {
  if (listenersAttached || typeof window === 'undefined') return
  listenersAttached = true

  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault()
    promptEvent = event as BeforeInstallPromptEvent
    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature: 'pwa_install',
      action: 'browser_prompt_ready',
    })
    emit()
  })

  window.addEventListener('appinstalled', () => {
    markInstalled()
    promptEvent = null
    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature: 'pwa_install',
      action: 'installed',
    })
    emit()
  })
}

export function usePwaInstall() {
  const [state, setState] = useState<InstallState>(() => getState())
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    installed = getStandaloneDisplay()
    setDismissed(readDismissed())
    setState(getState())
    ensureGlobalInstallListeners()

    subscribers.add(setState)
    return () => {
      subscribers.delete(setState)
    }
  }, [])

  const install = useCallback(async () => {
    if (!promptEvent) return 'unavailable' as const

    const event = promptEvent
    promptEvent = null
    emit()

    await event.prompt()
    const choice = await event.userChoice
    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature: 'pwa_install',
      action: choice.outcome,
      platform: choice.platform,
    })

    if (choice.outcome === 'accepted') {
      markInstalled()
    } else {
      markDismissed()
      setDismissed(true)
    }

    emit()
    return choice.outcome
  }, [])

  const dismiss = useCallback(() => {
    markDismissed()
    setDismissed(true)
    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature: 'pwa_install',
      action: 'dismissed',
    })
  }, [])

  const resetDismissal = useCallback(() => {
    try {
      window.localStorage.removeItem(DISMISS_KEY)
    } catch {
      // localStorage can be unavailable in restricted browsing modes.
    }
    setDismissed(false)
  }, [])

  return useMemo(
    () => ({
      browserName: getBrowserName(),
      canPromptInstall: Boolean(state.promptEvent),
      dismissed,
      dismiss,
      install,
      installed: state.installed,
      isAndroid: isAndroidDevice(),
      isIos: isIosDevice(),
      isStandalone: getStandaloneDisplay(),
      resetDismissal,
    }),
    [dismiss, dismissed, install, resetDismissal, state.installed, state.promptEvent]
  )
}
