'use client'

// Compliance placeholder notes — saved locally, to be wired to DB in Phase 2.
// Uses localStorage so notes persist across sessions without a server round-trip.

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'cannabis-compliance-notes-draft'

export function CompliancePlaceholderClient() {
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setNotes(stored)
  }, [])

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, notes)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value)
          setSaved(false)
        }}
        placeholder="Describe your compliance methods here... How do you conduct a cannabis dinner? What SOPs do you follow? What does Maine state law require you to log? How do you dose guests? What documentation do you take?"
        rows={8}
        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none transition-all"
        style={{
          background: '#0a130a',
          border: '1px solid rgba(74, 124, 78, 0.25)',
          color: '#e8f5e9',
          caretColor: '#8bc34a',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'rgba(139, 195, 74, 0.5)')}
        onBlur={(e) => (e.target.style.borderColor = 'rgba(74, 124, 78, 0.25)')}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: '#2d5a30' }}>
          Saved locally · will sync to database in Phase 2
        </p>
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
          style={{
            background: saved ? 'rgba(74, 124, 78, 0.3)' : 'rgba(74, 124, 78, 0.15)',
            color: saved ? '#8bc34a' : '#6aaa6e',
            border: '1px solid rgba(74, 124, 78, 0.2)',
          }}
        >
          {saved ? '✓ Saved' : 'Save Notes'}
        </button>
      </div>
    </div>
  )
}
