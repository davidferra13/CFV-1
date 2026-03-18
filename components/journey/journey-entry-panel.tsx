'use client'

import { FormEvent, useMemo, useState, useTransition } from 'react'
import { BookOpen, Link2, MapPin, Pencil, Plus, Sparkles, Trash2 } from '@/components/ui/icons'
import {
  createChefJourneyEntry,
  deleteChefJourneyEntry,
  updateChefJourneyEntry,
} from '@/lib/journey/actions'
import type { ChefJourneyEntry, ChefJourneyEntryType } from '@/lib/journey/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { showUndoToast } from '@/components/ui/undo-toast'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import dynamic from 'next/dynamic'

const LocationMap = dynamic(
  () => import('@/components/ui/location-map').then((m) => m.LocationMap),
  {
    loading: () => <div className="h-[200px] rounded-lg bg-stone-800 animate-pulse" />,
    ssr: false,
  }
)
import { formatDisplayDate, joinLines, parseLines } from './helpers'

type EntryFormState = {
  entry_type: ChefJourneyEntryType
  entry_date: string
  location_label: string
  formatted_address: string
  latitude: string
  longitude: string
  title: string
  narrative: string
  favorite_meal: string
  favorite_experience: string
  what_i_learned_text: string
  inspiration_taken_text: string
  dishes_to_explore_text: string
  mistakes_made_text: string
  proud_moments_text: string
  what_to_change_next_time_text: string
  source_links_text: string
  is_highlight: boolean
}

const ENTRY_TYPE_LABELS: Record<ChefJourneyEntryType, string> = {
  destination: 'Destination',
  meal: 'Meal',
  lesson: 'Lesson',
  experience: 'Experience',
  idea: 'Idea',
  reflection: 'Reflection',
  technique: 'Technique',
  ingredient: 'Ingredient',
}

const EMPTY_FORM: EntryFormState = {
  entry_type: 'reflection',
  entry_date: '',
  location_label: '',
  formatted_address: '',
  latitude: '',
  longitude: '',
  title: '',
  narrative: '',
  favorite_meal: '',
  favorite_experience: '',
  what_i_learned_text: '',
  inspiration_taken_text: '',
  dishes_to_explore_text: '',
  mistakes_made_text: '',
  proud_moments_text: '',
  what_to_change_next_time_text: '',
  source_links_text: '',
  is_highlight: false,
}

function buildForm(entry: ChefJourneyEntry): EntryFormState {
  return {
    entry_type: entry.entry_type,
    entry_date: entry.entry_date,
    location_label: entry.location_label,
    formatted_address: entry.formatted_address,
    latitude: entry.latitude !== null ? String(entry.latitude) : '',
    longitude: entry.longitude !== null ? String(entry.longitude) : '',
    title: entry.title,
    narrative: entry.narrative,
    favorite_meal: entry.favorite_meal,
    favorite_experience: entry.favorite_experience,
    what_i_learned_text: joinLines(entry.what_i_learned),
    inspiration_taken_text: joinLines(entry.inspiration_taken),
    dishes_to_explore_text: joinLines(entry.dishes_to_explore),
    mistakes_made_text: joinLines(entry.mistakes_made),
    proud_moments_text: joinLines(entry.proud_moments),
    what_to_change_next_time_text: joinLines(entry.what_to_change_next_time),
    source_links_text: joinLines(entry.source_links),
    is_highlight: entry.is_highlight,
  }
}

function sortEntries(entries: ChefJourneyEntry[]): ChefJourneyEntry[] {
  return [...entries].sort((a, b) => {
    const dateCompare = b.entry_date.localeCompare(a.entry_date)
    if (dateCompare !== 0) return dateCompare
    return b.created_at.localeCompare(a.created_at)
  })
}

export function JourneyEntryPanel({
  journeyId,
  initialEntries,
  onEntriesChange,
}: {
  journeyId: string
  initialEntries: ChefJourneyEntry[]
  onEntriesChange?: (entries: ChefJourneyEntry[]) => void
}) {
  const [entries, setEntries] = useState<ChefJourneyEntry[]>(sortEntries(initialEntries))
  const [form, setForm] = useState<EntryFormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(initialEntries.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deletingEntry, setDeletingEntry] = useState<ChefJourneyEntry | null>(null)

  const counts = useMemo(() => {
    const map = new Map<ChefJourneyEntryType, number>()
    for (const entry of entries) {
      map.set(entry.entry_type, (map.get(entry.entry_type) || 0) + 1)
    }
    return map
  }, [entries])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        if (editingId) {
          const result = await updateChefJourneyEntry(editingId, {
            entry_type: form.entry_type,
            entry_date: form.entry_date || null,
            location_label: form.location_label,
            formatted_address: form.formatted_address,
            latitude: form.latitude ? Number(form.latitude) : null,
            longitude: form.longitude ? Number(form.longitude) : null,
            title: form.title,
            narrative: form.narrative,
            favorite_meal: form.favorite_meal,
            favorite_experience: form.favorite_experience,
            what_i_learned: parseLines(form.what_i_learned_text),
            inspiration_taken: parseLines(form.inspiration_taken_text),
            dishes_to_explore: parseLines(form.dishes_to_explore_text),
            mistakes_made: parseLines(form.mistakes_made_text),
            proud_moments: parseLines(form.proud_moments_text),
            what_to_change_next_time: parseLines(form.what_to_change_next_time_text),
            source_links: parseLines(form.source_links_text),
            is_highlight: form.is_highlight,
          })
          setEntries((prev) => {
            const next = sortEntries(
              prev.map((entry) => (entry.id === result.entry.id ? result.entry : entry))
            )
            onEntriesChange?.(next)
            return next
          })
        } else {
          const result = await createChefJourneyEntry({
            journey_id: journeyId,
            entry_type: form.entry_type,
            entry_date: form.entry_date || null,
            location_label: form.location_label,
            formatted_address: form.formatted_address,
            latitude: form.latitude ? Number(form.latitude) : null,
            longitude: form.longitude ? Number(form.longitude) : null,
            title: form.title,
            narrative: form.narrative,
            favorite_meal: form.favorite_meal,
            favorite_experience: form.favorite_experience,
            what_i_learned: parseLines(form.what_i_learned_text),
            inspiration_taken: parseLines(form.inspiration_taken_text),
            dishes_to_explore: parseLines(form.dishes_to_explore_text),
            mistakes_made: parseLines(form.mistakes_made_text),
            proud_moments: parseLines(form.proud_moments_text),
            what_to_change_next_time: parseLines(form.what_to_change_next_time_text),
            source_links: parseLines(form.source_links_text),
            is_highlight: form.is_highlight,
          })
          setEntries((prev) => {
            const next = sortEntries([result.entry, ...prev])
            onEntriesChange?.(next)
            return next
          })
        }

        resetForm()
      } catch (entryError) {
        setError(entryError instanceof Error ? entryError.message : 'Failed to save journal entry')
      }
    })
  }

  const handleEdit = (entry: ChefJourneyEntry) => {
    setError(null)
    setEditingId(entry.id)
    setForm(buildForm(entry))
    setShowForm(true)
  }

  const handleDelete = (entry: ChefJourneyEntry) => {
    setDeletingEntry(entry)
  }

  const handleConfirmDelete = () => {
    if (!deletingEntry) return
    const entry = deletingEntry
    const previous = [...entries]
    setDeletingEntry(null)

    // Optimistic removal
    setEntries((prev) => {
      const next = prev.filter((item) => item.id !== entry.id)
      onEntriesChange?.(next)
      return next
    })

    showUndoToast({
      message: 'Journey entry deleted',
      duration: 8000,
      onExecute: async () => {
        try {
          await deleteChefJourneyEntry(entry.id)
        } catch (deleteError) {
          setEntries(previous)
          onEntriesChange?.(previous)
          toast.error(
            deleteError instanceof Error ? deleteError.message : 'Failed to delete journal entry'
          )
        }
      },
      onUndo: () => {
        setEntries(previous)
        onEntriesChange?.(previous)
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setEditingId(null)
            setForm(EMPTY_FORM)
            setShowForm((prev) => !prev)
          }}
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Hide Entry Form' : 'Add Entry'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border border-stone-700 rounded-lg p-4 space-y-4 bg-stone-800/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">Entry Type</label>
              <select
                value={form.entry_type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    entry_type: event.target.value as ChefJourneyEntryType,
                  }))
                }
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                {Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Date"
              type="date"
              value={form.entry_date}
              onChange={(event) => setForm((prev) => ({ ...prev, entry_date: event.target.value }))}
            />
            <Input
              label="Location"
              value={form.location_label}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, location_label: event.target.value }))
              }
              placeholder="Naples"
            />
          </div>

          <Input
            label="Address (optional)"
            value={form.formatted_address}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, formatted_address: event.target.value }))
            }
            placeholder="Piazza Navona, Rome, Italy"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Latitude (optional)"
              value={form.latitude}
              onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
              placeholder="41.8986"
            />
            <Input
              label="Longitude (optional)"
              value={form.longitude}
              onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
              placeholder="12.4769"
            />
          </div>

          <Input
            label="Title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />

          <Textarea
            label="Narrative"
            value={form.narrative}
            onChange={(event) => setForm((prev) => ({ ...prev, narrative: event.target.value }))}
            rows={4}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Textarea
              label="Favorite Meal"
              value={form.favorite_meal}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, favorite_meal: event.target.value }))
              }
              rows={3}
            />
            <Textarea
              label="Favorite Experience"
              value={form.favorite_experience}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, favorite_experience: event.target.value }))
              }
              rows={3}
            />
            <Textarea
              label="Dishes to Explore"
              value={form.dishes_to_explore_text}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dishes_to_explore_text: event.target.value }))
              }
              rows={3}
            />
            <Textarea
              label="What I Learned"
              value={form.what_i_learned_text}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, what_i_learned_text: event.target.value }))
              }
              rows={3}
            />
            <Textarea
              label="Inspiration Taken"
              value={form.inspiration_taken_text}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, inspiration_taken_text: event.target.value }))
              }
              rows={3}
            />
            <Textarea
              label="Mistakes / Missteps"
              value={form.mistakes_made_text}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, mistakes_made_text: event.target.value }))
              }
              rows={3}
            />
            <Textarea
              label="Proud Moments"
              value={form.proud_moments_text}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, proud_moments_text: event.target.value }))
              }
              rows={3}
            />
            <Textarea
              label="What To Change Next Time"
              value={form.what_to_change_next_time_text}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, what_to_change_next_time_text: event.target.value }))
              }
              rows={3}
            />
            <Textarea
              label="Source Links"
              value={form.source_links_text}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, source_links_text: event.target.value }))
              }
              rows={3}
              placeholder="https://... one per line"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-stone-300">
            <input
              type="checkbox"
              checked={form.is_highlight}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, is_highlight: event.target.checked }))
              }
              className="rounded border-stone-600"
            />
            Highlight this entry
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-950 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : editingId ? 'Update Entry' : 'Add Entry'}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="border border-dashed border-stone-600 rounded-lg p-8 text-center text-sm text-stone-400">
            No entries yet. Add your first log entry.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="border border-stone-700 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">{ENTRY_TYPE_LABELS[entry.entry_type]}</Badge>
                    {entry.is_highlight && <Badge variant="success">Highlight</Badge>}
                    <span className="text-xs text-stone-500">
                      {formatDisplayDate(entry.entry_date)}
                    </span>
                  </div>
                  <p className="font-semibold text-stone-100">{entry.title}</p>
                </div>

                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(entry)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-950"
                    onClick={() => handleDelete(entry)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {entry.narrative && (
                <p className="text-sm text-stone-300 whitespace-pre-wrap">{entry.narrative}</p>
              )}

              {(entry.location_label || entry.formatted_address) && (
                <div className="flex flex-wrap gap-2 text-xs text-stone-400">
                  {entry.location_label && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-stone-700 bg-stone-800 px-2 py-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-500" />
                      {entry.location_label}
                    </span>
                  )}
                  {entry.formatted_address && (
                    <span className="rounded-md border border-stone-700 bg-stone-800 px-2 py-1">
                      {entry.formatted_address}
                    </span>
                  )}
                </div>
              )}

              {(entry.favorite_meal || entry.favorite_experience) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {entry.favorite_meal && (
                    <div className="rounded-md border border-amber-200 bg-amber-950 px-3 py-2">
                      <p className="text-xs-tight uppercase tracking-wide text-amber-700">
                        Favorite Meal
                      </p>
                      <p className="text-sm text-amber-900 mt-1 whitespace-pre-wrap">
                        {entry.favorite_meal}
                      </p>
                    </div>
                  )}
                  {entry.favorite_experience && (
                    <div className="rounded-md border border-sky-200 bg-sky-950 px-3 py-2">
                      <p className="text-xs-tight uppercase tracking-wide text-sky-700">
                        Favorite Experience
                      </p>
                      <p className="text-sm text-sky-900 mt-1 whitespace-pre-wrap">
                        {entry.favorite_experience}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {entry.what_i_learned.map((learning, index) => (
                  <span
                    key={`${entry.id}-learned-${index}`}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-950 text-amber-700 px-2 py-0.5 text-xs-tight"
                  >
                    <BookOpen className="w-3 h-3" />
                    {learning}
                  </span>
                ))}
                {entry.inspiration_taken.map((idea, index) => (
                  <span
                    key={`${entry.id}-idea-${index}`}
                    className="inline-flex items-center gap-1 rounded-full bg-sky-950 text-sky-700 px-2 py-0.5 text-xs-tight"
                  >
                    <Sparkles className="w-3 h-3" />
                    {idea}
                  </span>
                ))}
              </div>

              {entry.dishes_to_explore.length > 0 && (
                <div className="rounded-md border border-stone-700 bg-stone-800 px-3 py-2">
                  <p className="text-xs-tight uppercase tracking-wide text-stone-500">
                    Dishes to Explore
                  </p>
                  <p className="text-sm text-stone-200 mt-1">
                    {entry.dishes_to_explore.join(' | ')}
                  </p>
                </div>
              )}

              {(entry.mistakes_made.length > 0 ||
                entry.proud_moments.length > 0 ||
                entry.what_to_change_next_time.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {entry.mistakes_made.length > 0 && (
                    <div className="rounded-md border border-red-200 bg-red-950 px-3 py-2">
                      <p className="text-xs-tight uppercase tracking-wide text-red-700">
                        Mistakes / Missteps
                      </p>
                      <p className="text-sm text-red-900 mt-1 whitespace-pre-wrap">
                        {entry.mistakes_made.join('\n')}
                      </p>
                    </div>
                  )}
                  {entry.proud_moments.length > 0 && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-950 px-3 py-2">
                      <p className="text-xs-tight uppercase tracking-wide text-emerald-700">
                        Proud Moments
                      </p>
                      <p className="text-sm text-emerald-900 mt-1 whitespace-pre-wrap">
                        {entry.proud_moments.join('\n')}
                      </p>
                    </div>
                  )}
                  {entry.what_to_change_next_time.length > 0 && (
                    <div className="rounded-md border border-violet-200 bg-violet-950 px-3 py-2">
                      <p className="text-xs-tight uppercase tracking-wide text-violet-700">
                        Change Next Time
                      </p>
                      <p className="text-sm text-violet-900 mt-1 whitespace-pre-wrap">
                        {entry.what_to_change_next_time.join('\n')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {entry.latitude !== null && entry.longitude !== null && (
                <LocationMap lat={entry.latitude} lng={entry.longitude} className="h-56" />
              )}

              {entry.source_links.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-stone-500">Source Links</p>
                  <div className="flex flex-wrap gap-2">
                    {entry.source_links.map((link, index) => (
                      <a
                        key={`${entry.id}-link-${index}`}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-stone-700 bg-stone-900 px-2 py-0.5 text-xs text-brand-500 hover:text-brand-400"
                      >
                        <Link2 className="w-3 h-3" />
                        Source {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {entries.length > 0 && (
        <div className="rounded-lg border border-stone-700 p-3 text-xs flex flex-wrap gap-2">
          {(Object.keys(ENTRY_TYPE_LABELS) as ChefJourneyEntryType[])
            .filter((type) => (counts.get(type) || 0) > 0)
            .map((type) => (
              <span
                key={type}
                className="rounded-full border border-stone-700 bg-stone-800 px-2 py-0.5 text-stone-300"
              >
                {ENTRY_TYPE_LABELS[type]}: {counts.get(type)}
              </span>
            ))}
        </div>
      )}

      <ConfirmModal
        open={!!deletingEntry}
        title={`Delete entry "${deletingEntry?.title}"?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingEntry(null)}
      />
    </div>
  )
}
