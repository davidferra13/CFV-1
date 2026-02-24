'use client'

import { useState, useTransition } from 'react'
import { createEducationEntry } from '@/lib/professional/education-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

type Entry = {
  id: string
  entry_type: string
  title: string
  learned: string | null
  entry_date: string
}

const ENTRY_TYPES = [
  { value: 'online_course', label: 'Online Course' },
  { value: 'book', label: 'Book' },
  { value: 'stage', label: 'Stage/Apprenticeship' },
  { value: 'travel', label: 'Travel' },
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'experimentation', label: 'Experimentation' },
  { value: 'other', label: 'Other' },
]

export function EducationLog({ entries }: { entries: Entry[] }) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [entryType, setEntryType] = useState('online_course')
  const [title, setTitle] = useState('')
  const [learned, setLearned] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await createEducationEntry({
        entry_type: entryType,
        title,
        learned: learned || undefined,
        entry_date: entryDate,
      })
      setTitle('')
      setLearned('')
      setShowForm(false)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-stone-500">{entries.length} entries</p>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          Add Entry
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="py-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">Type</label>
                  <select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value)}
                    className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
                    title="Entry type"
                  >
                    {ENTRY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
                    title="Entry date"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  What did you learn?
                </label>
                <textarea
                  value={learned}
                  onChange={(e) => setLearned(e.target.value)}
                  rows={2}
                  className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending || !title.trim()}>
                  {isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="default">{entry.entry_type.replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-stone-400">
                    {format(new Date(entry.entry_date), 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="text-sm font-medium text-stone-100">{entry.title}</p>
                {entry.learned && <p className="text-sm text-stone-400 mt-1">{entry.learned}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
