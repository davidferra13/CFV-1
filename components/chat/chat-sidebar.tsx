'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  ChevronRight,
  ChevronLeft,
  StickyNote,
  Brain,
  Pin,
  User,
  Plus,
} from '@/components/ui/icons'
import { addClientNote } from '@/lib/notes/actions'
import { QuickNoteForm } from '@/components/clients/quick-note-form'
import { ChatInsightsPanel } from '@/components/chat/chat-insights-panel'
import type { ClientNote, NoteCategory } from '@/lib/notes/actions'
import type { ChatInsight } from '@/lib/insights/actions'
import Link from 'next/link'

const CATEGORY_STYLES: Record<NoteCategory, { bg: string; text: string }> = {
  general: { bg: 'bg-stone-800', text: 'text-stone-300' },
  dietary: { bg: 'bg-red-900', text: 'text-red-700' },
  preference: { bg: 'bg-blue-900', text: 'text-blue-700' },
  logistics: { bg: 'bg-green-900', text: 'text-green-700' },
  relationship: { bg: 'bg-purple-900', text: 'text-purple-700' },
}

interface ChatSidebarProps {
  clientId: string
  clientName: string
  pinnedNotes: ClientNote[]
  initialInsights?: ChatInsight[]
}

export function ChatSidebar({
  clientId,
  clientName,
  pinnedNotes: initialNotes,
  initialInsights = [],
}: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [notes, setNotes] = useState(initialNotes)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleAddNote = async (data: { note_text: string; category: NoteCategory }) => {
    startTransition(async () => {
      try {
        const result = await addClientNote({
          client_id: clientId,
          note_text: data.note_text,
          category: data.category,
          pinned: true,
        })
        setNotes((prev) => [result.note, ...prev])
        setShowAddForm(false)
      } catch (err) {
        toast.error('Failed to add note')
      }
    })
  }

  if (collapsed) {
    return (
      <div className="w-10 border-l border-stone-700 bg-stone-900 flex flex-col items-center pt-3">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="p-1.5 text-stone-400 hover:text-stone-400 transition-colors"
          title="Show sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="mt-3 flex flex-col items-center gap-2">
          <StickyNote className="w-4 h-4 text-stone-400" />
          {notes.length > 0 && <span className="text-[10px] text-stone-400">{notes.length}</span>}
          {initialInsights.length > 0 && (
            <>
              <Brain className="w-4 h-4 text-amber-400 mt-1" />
              <span className="text-[10px] text-amber-500">{initialInsights.length}</span>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-72 border-l border-stone-700 bg-stone-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-stone-800">
        <Link
          href={`/clients/${clientId}`}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-400 truncate"
        >
          <User className="w-3.5 h-3.5 flex-shrink-0" />
          {clientName}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="p-1 text-stone-400 hover:text-stone-400 transition-colors"
          title="Collapse sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Pinned Notes */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Pin className="w-3 h-3 text-stone-400" />
            <span className="text-xs font-medium text-stone-500">Pinned Notes</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-0.5 text-stone-400 hover:text-brand-600 transition-colors"
            title="Add note"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {showAddForm && (
          <div className="px-3 pb-2">
            <QuickNoteForm
              onSubmit={handleAddNote}
              onCancel={() => setShowAddForm(false)}
              submitting={isPending}
            />
          </div>
        )}

        {notes.length === 0 && !showAddForm && (
          <p className="px-3 py-4 text-xs text-stone-400 text-center">No pinned notes</p>
        )}

        <div className="space-y-1 px-3 pb-3">
          {notes.map((note) => (
            <div key={note.id} className="p-2 rounded-lg bg-stone-800 border border-stone-800">
              <div className="flex items-start gap-1.5">
                <span
                  className={`flex-shrink-0 mt-0.5 inline-block w-1.5 h-1.5 rounded-full ${CATEGORY_STYLES[note.category].bg}`}
                />
                <p className="text-xs text-stone-300 leading-relaxed line-clamp-4">
                  {note.note_text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* AI Insights */}
        <ChatInsightsPanel initialInsights={initialInsights} />
      </div>
    </div>
  )
}
