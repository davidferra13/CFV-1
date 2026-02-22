'use client'

// useOfflineForm — Saves form data to localStorage as the user types.
// If the page reloads or the user goes offline mid-edit, the draft is restored.
// Drafts are automatically cleared after a successful form submission.

import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_PREFIX = 'chefflow:draft:'

interface UseOfflineFormOptions<T> {
  /** Unique key for this form (e.g. 'event-new' or 'event-edit-abc123') */
  key: string
  /** Default/initial values for the form */
  defaultValues: T
  /** Debounce interval for saving (ms). Default: 500 */
  debounceMs?: number
}

export function useOfflineForm<T extends Record<string, unknown>>(
  options: UseOfflineFormOptions<T>
) {
  const { key, defaultValues, debounceMs = 500 } = options
  const storageKey = `${STORAGE_PREFIX}${key}`

  // Load saved draft or use defaults
  const [values, setValues] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as { data: T; savedAt: string }
        // Only restore drafts less than 24 hours old
        const savedAt = new Date(parsed.savedAt)
        const hoursSinceSave = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60)
        if (hoursSinceSave < 24) {
          return { ...defaultValues, ...parsed.data }
        }
        // Expired draft — clean it up
        localStorage.removeItem(storageKey)
      }
    } catch {
      // localStorage unavailable or corrupt data
    }
    return defaultValues
  })

  const [hasDraft, setHasDraft] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check if there's a draft on mount
  useEffect(() => {
    try {
      setHasDraft(localStorage.getItem(storageKey) !== null)
    } catch {
      // private browsing
    }
  }, [storageKey])

  // Save to localStorage (debounced)
  const saveDraft = useCallback(
    (data: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({ data, savedAt: new Date().toISOString() })
          )
          setHasDraft(true)
        } catch {
          // Storage full or unavailable — not critical
        }
      }, debounceMs)
    },
    [storageKey, debounceMs]
  )

  // Update a single field
  const updateField = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValues((prev) => {
        const next = { ...prev, [field]: value }
        saveDraft(next)
        return next
      })
    },
    [saveDraft]
  )

  // Update multiple fields at once
  const updateFields = useCallback(
    (updates: Partial<T>) => {
      setValues((prev) => {
        const next = { ...prev, ...updates }
        saveDraft(next)
        return next
      })
    },
    [saveDraft]
  )

  // Clear the draft (call after successful submission)
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      setHasDraft(false)
    } catch {
      // not critical
    }
  }, [storageKey])

  // Discard draft and reset to defaults
  const discardDraft = useCallback(() => {
    clearDraft()
    setValues(defaultValues)
  }, [clearDraft, defaultValues])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    /** Current form values (restored from draft if available) */
    values,
    /** Whether a draft exists in storage */
    hasDraft,
    /** Update a single field */
    updateField,
    /** Update multiple fields */
    updateFields,
    /** Set all values at once */
    setValues: (newValues: T) => {
      setValues(newValues)
      saveDraft(newValues)
    },
    /** Clear the draft (call after successful submit) */
    clearDraft,
    /** Discard draft and reset to defaults */
    discardDraft,
  }
}
