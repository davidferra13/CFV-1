'use client'

// InlineEditCell — Double-click to edit a table cell value in place.
// Calls onSave() with the new string when the user presses Enter or blurs.
// Pressing Escape cancels and restores the original value.

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface InlineEditCellProps {
  value: string | number | null
  onSave: (newValue: string) => Promise<void>
  type?: 'text' | 'number' | 'email'
  placeholder?: string
  className?: string
  /** Format the display value differently from the raw stored value */
  displayValue?: string
}

export function InlineEditCell({
  value,
  onSave,
  type = 'text',
  placeholder = '—',
  className = '',
  displayValue,
}: InlineEditCellProps) {
  const rawValue = value === null || value === undefined ? '' : String(value)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(rawValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep draft in sync if the prop changes (e.g. after server revalidation)
  useEffect(() => {
    if (!editing) {
      setDraft(rawValue)
    }
  }, [rawValue, editing])

  // Focus the input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function enterEditMode() {
    setDraft(rawValue)
    setError(null)
    setEditing(true)
  }

  function cancel() {
    setDraft(rawValue)
    setError(null)
    setEditing(false)
  }

  async function commit() {
    const trimmed = draft.trim()

    // No change — just exit edit mode without calling onSave
    if (trimmed === rawValue.trim()) {
      setEditing(false)
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave(trimmed)
      setEditing(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      setError(message)
      // Auto-clear the error after 3 s
      setTimeout(() => setError(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className={`relative ${className}`}>
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          disabled={saving}
          placeholder={placeholder}
          className="w-full px-2 py-1 text-sm border border-brand-400 rounded focus:outline-none focus:ring-2 focus:ring-brand-500 bg-stone-900 disabled:opacity-60"
        />
        {saving && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-400">
            Saving…
          </span>
        )}
        {error && (
          <div className="absolute left-0 top-full mt-1 z-10 bg-red-950 border border-red-200 text-red-700 text-xs px-2 py-1 rounded shadow-sm whitespace-nowrap">
            {error}
          </div>
        )}
      </div>
    )
  }

  // ── Display mode ───────────────────────────────────────────────────────────
  const shown = displayValue ?? (rawValue || placeholder)

  return (
    <div
      role="button"
      tabIndex={0}
      onDoubleClick={enterEditMode}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault()
          enterEditMode()
        }
      }}
      title="Double-click to edit"
      className={`group relative inline-flex items-center gap-1.5 cursor-text rounded px-1 -mx-1 hover:bg-stone-700 transition-colors select-none ${className}`}
    >
      <span className={rawValue ? '' : 'text-stone-400 italic'}>{shown}</span>
      {/* Pencil icon — visible on hover */}
      <svg
        className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    </div>
  )
}
