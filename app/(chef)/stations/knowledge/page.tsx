// Shift Knowledge Search - Search all past shift handoff notes.
// Solves: "nothing compounds" by making past operational knowledge findable.

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { searchShiftNotes } from '@/lib/shifts/actions'

type ShiftNote = {
  id: string
  chef_id: string
  author_id: string | null
  author_name: string
  shift: 'opening' | 'mid' | 'closing'
  date: string
  content: string
  pinned: boolean
  created_at: string
}

const SHIFT_LABELS: Record<string, string> = {
  opening: 'Opening',
  mid: 'Mid',
  closing: 'Closing',
}

const SHIFT_COLORS: Record<string, 'success' | 'warning' | 'info'> = {
  opening: 'success',
  mid: 'warning',
  closing: 'info',
}

function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text
  // Return plain text, no HTML injection risk
  return text
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ShiftKnowledgePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ShiftNote[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        const notes = await searchShiftNotes(query)
        setResults(notes)
        setHasSearched(true)
      } catch (err) {
        console.error('Search failed:', err)
        setResults([])
        setHasSearched(true)
      }
    })
  }

  // Load recent notes on first render
  function handleLoadRecent() {
    startTransition(async () => {
      try {
        const notes = await searchShiftNotes('')
        setResults(notes)
        setHasSearched(true)
      } catch (err) {
        console.error('Load failed:', err)
      }
    })
  }

  // Group results by date for easier scanning
  const groupedByDate: Record<string, ShiftNote[]> = {}
  for (const note of results) {
    if (!groupedByDate[note.date]) groupedByDate[note.date] = []
    groupedByDate[note.date].push(note)
  }
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/stations" className="text-stone-500 hover:text-stone-300">
          Stations
        </Link>
        <span className="text-stone-600">/</span>
        <span className="text-stone-300">Knowledge Base</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-stone-100">Shift Knowledge Base</h1>
        <p className="mt-1 text-sm text-stone-500">
          Search all shift handoff notes. Find what was learned, when, and by whom.
        </p>
      </div>

      {/* Search form */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes... (e.g. sauce, timing, heat, 86)"
              className="flex-1 rounded-lg border border-stone-600 bg-stone-900 px-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-stone-400 focus:outline-none"
            />
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Searching...' : 'Search'}
            </Button>
          </form>
          {!hasSearched && (
            <button
              type="button"
              onClick={handleLoadRecent}
              className="mt-3 text-sm text-stone-500 hover:text-stone-300 transition-colors"
            >
              Or load recent notes
            </button>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && results.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500 text-sm">
              {query.trim()
                ? `No notes found matching "${query}". Try a different search term.`
                : 'No shift notes found. Notes will appear here as you write them in Daily Ops.'}
            </p>
          </CardContent>
        </Card>
      )}

      {sortedDates.map((date) => (
        <div key={date}>
          <h2 className="text-sm font-medium text-stone-400 mb-2">{formatDate(date)}</h2>
          <div className="space-y-2">
            {groupedByDate[date].map((note) => (
              <Card key={note.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={SHIFT_COLORS[note.shift] ?? 'default'}>
                          {SHIFT_LABELS[note.shift] ?? note.shift}
                        </Badge>
                        <span className="text-xs text-stone-500">{note.author_name}</span>
                        {note.pinned && <Badge variant="warning">Pinned</Badge>}
                      </div>
                      <p className="text-sm text-stone-200 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
