'use client'

import { useState, useEffect, useRef } from 'react'

interface DraftSaveIndicatorProps {
  /** Whether a save is currently in progress */
  saving?: boolean
  /** ISO timestamp of the last successful save */
  lastSavedAt: string | null
}

/**
 * Small floating badge that shows draft save status.
 * Place in the top-right corner of a form card.
 *
 * States:
 * - saving=true: "Saving..."
 * - Just saved (within 2s): "Draft saved" ✓
 * - Idle: hidden (fades out)
 */
export function DraftSaveIndicator({ saving, lastSavedAt }: DraftSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false)
  const prevSavedAt = useRef(lastSavedAt)

  // Detect when lastSavedAt changes (new save completed)
  useEffect(() => {
    if (lastSavedAt && lastSavedAt !== prevSavedAt.current) {
      prevSavedAt.current = lastSavedAt
      setShowSaved(true)
      const timer = setTimeout(() => setShowSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [lastSavedAt])

  if (saving) {
    return <span className="text-xs text-stone-500 animate-pulse">Saving...</span>
  }

  if (showSaved) {
    return (
      <span className="text-xs text-emerald-500 transition-opacity duration-500">
        Draft saved ✓
      </span>
    )
  }

  return null
}
