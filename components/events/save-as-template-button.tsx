'use client'

import { useState } from 'react'
import { saveEventAsTemplate } from '@/lib/events/template-actions'

type Props = {
  eventId: string
}

export function SaveAsTemplateButton({ eventId }: Props) {
  const [showInput, setShowInput] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await saveEventAsTemplate(eventId, name.trim())
      setSaved(true)
    } catch (err) {
      console.error('[SaveAsTemplate]', err)
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return <span className="text-sm text-emerald-400">Saved as template</span>
  }

  if (showInput) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name..."
          className="px-3 py-1.5 text-sm rounded-lg bg-stone-800 border border-stone-600 text-stone-100"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-3 py-1.5 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {saving ? '...' : 'Save'}
        </button>
        <button
          onClick={() => setShowInput(false)}
          className="px-3 py-1.5 text-sm rounded-lg bg-stone-700 text-stone-300 hover:bg-stone-600"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowInput(true)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-stone-800 border border-stone-700 text-stone-300 hover:text-stone-100 hover:border-stone-500 transition-colors"
    >
      Save as Template
    </button>
  )
}
