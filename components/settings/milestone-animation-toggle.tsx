'use client'

import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import {
  MILESTONE_ANIMATIONS_ENABLED_KEY,
  MILESTONE_ANIMATIONS_PREF_EVENT,
  readMilestoneAnimationsEnabled,
  writeMilestoneAnimationsEnabled,
} from '@/lib/milestones/preferences'

export function MilestoneAnimationToggle() {
  const [mounted, setMounted] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    function syncPreference() {
      setEnabled(readMilestoneAnimationsEnabled())
      setMounted(true)
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === null || event.key === MILESTONE_ANIMATIONS_ENABLED_KEY) {
        syncPreference()
      }
    }

    syncPreference()
    window.addEventListener(MILESTONE_ANIMATIONS_PREF_EVENT, syncPreference)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(MILESTONE_ANIMATIONS_PREF_EVENT, syncPreference)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  if (!mounted) return null

  return (
    <Switch
      checked={enabled}
      onCheckedChange={(next) => {
        setEnabled(next)
        writeMilestoneAnimationsEnabled(next)
      }}
      aria-label="Enable milestone animations"
    />
  )
}
