'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { NoteCategory } from '@/lib/notes/actions'

const CATEGORIES: { value: NoteCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'dietary', label: 'Dietary' },
  { value: 'preference', label: 'Preference' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'relationship', label: 'Relationship' },
]

interface QuickNoteFormProps {
  initialData?: { note_text: string; category: NoteCategory }
  onSubmit: (data: { note_text: string; category: NoteCategory }) => Promise<void>
  onCancel: () => void
  submitting?: boolean
}

export function QuickNoteForm({
  initialData,
  onSubmit,
  onCancel,
  submitting = false,
}: QuickNoteFormProps) {
  const [noteText, setNoteText] = useState(initialData?.note_text || '')
  const [category, setCategory] = useState<NoteCategory>(initialData?.category || 'general')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteText.trim()) return
    await onSubmit({ note_text: noteText.trim(), category })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder="Write a note..."
        rows={2}
        autoFocus
        className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />

      <div className="flex items-center justify-between">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as NoteCategory)}
          className="text-xs border border-stone-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-3 py-1 text-xs text-stone-600 hover:text-stone-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!noteText.trim() || submitting}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
            {initialData ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}
