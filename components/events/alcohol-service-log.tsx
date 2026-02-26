'use client'

import { useState, useTransition } from 'react'
import { Wine, Clock, Users, Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { addAlcoholLogEntry, setLastCall, updateLogNotes } from '@/lib/events/alcohol-log-actions'

type LogEntry = {
  id: string
  time: string
  drink_type: string
  guests_served: number
  notes: string | null
}

type AlcoholLog = {
  id: string
  log_entries: LogEntry[]
  last_call_at: string | null
  notes: string | null
}

type Props = {
  eventId: string
  log: AlcoholLog | null
}

const DRINK_TYPES = ['beer', 'wine', 'spirits', 'cocktail', 'other'] as const
type DrinkType = (typeof DRINK_TYPES)[number]

export function AlcoholServiceLog({ eventId, log }: Props) {
  const [isPending, startTransition] = useTransition()
  const [drinkType, setDrinkType] = useState<DrinkType>('beer')
  const [guestsServed, setGuestsServed] = useState('')
  const [entryNotes, setEntryNotes] = useState('')
  const [generalNotes, setGeneralNotes] = useState(log?.notes ?? '')
  const [notesSaved, setNotesSaved] = useState(false)

  if (!log) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Alcohol log not initialized. Refresh the page to load it.
      </div>
    )
  }

  const entries = log.log_entries as LogEntry[]

  function handleAddEntry() {
    const guests = parseInt(guestsServed, 10)
    if (!guestsServed || isNaN(guests) || guests < 1) return

    startTransition(async () => {
      await addAlcoholLogEntry(log!.id, {
        drink_type: drinkType,
        guests_served: guests,
        notes: entryNotes.trim() || undefined,
      })
      setGuestsServed('')
      setEntryNotes('')
    })
  }

  function handleSetLastCall() {
    startTransition(async () => {
      await setLastCall(log!.id)
    })
  }

  function handleSaveNotes() {
    startTransition(async () => {
      await updateLogNotes(log!.id, generalNotes)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wine className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-base">Alcohol Service Log</h3>
        </div>
        <div>
          {log.last_call_at ? (
            <Badge variant="warning">
              <BellOff className="mr-1 h-3 w-3" />
              Last Call Set —{' '}
              {new Date(log.last_call_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </Badge>
          ) : (
            <Button variant="secondary" size="sm" disabled={isPending} onClick={handleSetLastCall}>
              <Bell className="mr-1.5 h-4 w-4" />
              Set Last Call
            </Button>
          )}
        </div>
      </div>

      {/* Log entries table */}
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No entries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  <Clock className="mr-1 inline h-3 w-3" />
                  Time
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Drink</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  <Users className="mr-1 inline h-3 w-3" />
                  Guests
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(entry.time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </td>
                  <td className="px-3 py-2 capitalize">{entry.drink_type}</td>
                  <td className="px-3 py-2">{entry.guests_served}</td>
                  <td className="px-3 py-2 text-muted-foreground">{entry.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add entry form */}
      <div className="rounded-md border p-3 space-y-3">
        <p className="text-sm font-medium">Add Entry</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Drink Type</label>
            <select
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={drinkType}
              onChange={(e) => setDrinkType(e.target.value as DrinkType)}
              disabled={isPending}
            >
              {DRINK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Guests Served</label>
            <Input
              type="number"
              min={1}
              placeholder="0"
              value={guestsServed}
              onChange={(e) => setGuestsServed(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-muted-foreground">Notes (optional)</label>
            <Input
              type="text"
              placeholder="e.g. switched to mocktails after 9pm"
              value={entryNotes}
              onChange={(e) => setEntryNotes(e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending || !guestsServed}
          onClick={handleAddEntry}
        >
          Add Entry
        </Button>
      </div>

      {/* General notes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">General Notes</label>
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          rows={3}
          placeholder="Overall alcohol service notes for this event…"
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          disabled={isPending}
        />
        <Button variant="secondary" size="sm" disabled={isPending} onClick={handleSaveNotes}>
          {notesSaved ? 'Saved!' : 'Save Notes'}
        </Button>
      </div>
    </div>
  )
}
