'use client'

import { useEffect, useState } from 'react'

const ONBOARDING_PERIPHERALS_ALLOWED_KEY = 'cf-onboarding-peripherals-allowed'
const ONBOARDING_PERIPHERALS_EVENT = 'cf:onboarding-peripherals'

type OnboardingPeripheralState = {
  showWelcome: boolean
  showChecklist: boolean
  isTourActive: boolean
}

export function computeOnboardingPeripheralVisibility({
  showWelcome,
  showChecklist,
  isTourActive,
}: OnboardingPeripheralState): boolean {
  return !(showWelcome || showChecklist || isTourActive)
}

function readAllowedFlag(): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(ONBOARDING_PERIPHERALS_ALLOWED_KEY) === '1'
  } catch {
    return false
  }
}

function broadcastAllowedFlag(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ONBOARDING_PERIPHERALS_EVENT))
}

export function publishOnboardingPeripheralVisibility(allowed: boolean): void {
  if (typeof window === 'undefined') return

  try {
    if (allowed) {
      window.localStorage.setItem(ONBOARDING_PERIPHERALS_ALLOWED_KEY, '1')
    } else {
      window.localStorage.removeItem(ONBOARDING_PERIPHERALS_ALLOWED_KEY)
    }
  } catch {
    // Ignore localStorage failures. Subscribers will stay hidden by default.
  }

  broadcastAllowedFlag()
}

export function useOnboardingPeripheralsEnabled(): boolean {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const sync = () => setEnabled(readAllowedFlag())
    const timer = window.setTimeout(sync, 0)

    window.addEventListener(ONBOARDING_PERIPHERALS_EVENT, sync)
    window.addEventListener('storage', sync)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(ONBOARDING_PERIPHERALS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return enabled
}
