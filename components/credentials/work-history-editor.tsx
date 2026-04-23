'use client'

// WorkHistoryEditor - Chef-side editor for career timeline entries.
// Renders current entries and an add/edit form.

import { useState, useTransition } from 'react'
import {
  saveWorkHistoryEntry,
  deleteWorkHistoryEntry,
  reorderWorkHistoryEntries,
  type ChefWorkHistoryEntry,
} from '@/lib/credentials/actions'

type Props = {
  initialEntries: ChefWorkHistoryEntry[]
}

type EditState = Partial<ChefWorkHistoryEntry> & { notableCreditsText?: string }

const EMPTY_FORM: EditState = {
  role_title: '',
  organization_name: '',
  location_label: '',
  start_date: '',
  end_date: '',
  is_current: false,
  summary: '',
  notable_credits: [],
  notableCreditsText: '',
  is_public: true,
  display_order: 0,
}

function formatDateRange(
  startDate: string | null,
  endDate: string | null,
  isCurrent: boolean
): string {
  const fmt = (d: string) => {
    const date = new Date(`${d}T00:00:00`)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  if (startDate && isCurrent) return `${fmt(startDate)} - Present`
  if (startDate && endDate) return `${fmt(startDate)} - ${fmt(endDate)}`
  if (startDate) return fmt(startDate)
  if (isCurrent) return 'Present'
  return ''
}

export function WorkHistoryEditor({ initialEntries }: Props) {
  const [entries, setEntries] = useState<ChefWorkHistoryEntry[]>(initialEntries)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  function openNew() {
    setEditingId(null)
    setEditing({ ...EMPTY_FORM, display_order: entries.length })
    setError(null)
  }

  function openEdit(entry: ChefWorkHistoryEntry) {
    setEditingId(entry.id)
    setEditing({
      ...entry,
      notableCreditsText: entry.notable_credits.join(', '),
    })
    setError(null)
  }

  function cancelEdit() {
    setEditing(null)
    setEditingId(null)
    setError(null)
  }

  function handleSave() {
    if (!editing) return
    const prevEntries = entries
    const credits = (editing.notableCreditsText || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    startTransition(async () => {
      try {
        const res = await saveWorkHistoryEntry({
          id: editingId ?? undefined,
          roleTitle: editing.role_title ?? '',
          organizationName: editing.organization_name ?? '',
          locationLabel: editing.location_label || null,
          startDate: editing.start_date || null,
          endDate: editing.end_date || null,
          isCurrent: editing.is_current ?? false,
          summary: editing.summary || null,
          notableCredits: credits,
          isPublic: editing.is_public ?? true,
          displayOrder: editing.display_order ?? 0,
        })

        if (!res.success || !res.entry) {
          setError(res.error ?? 'Save failed')
          setEntries(prevEntries)
          return
        }

        if (editingId) {
          setEntries((prev) => prev.map((e) => (e.id === editingId ? res.entry! : e)))
        } else {
          setEntries((prev) => [...prev, res.entry!])
        }
        setEditing(null)
        setEditingId(null)
        setError(null)
      } catch {
        setError('Unexpected error. Please try again.')
        setEntries(prevEntries)
      }
    })
  }

  function handleDelete(id: string) {
    const prevEntries = entries
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setDeleteConfirm(null)

    startTransition(async () => {
      try {
        const res = await deleteWorkHistoryEntry(id)
        if (!res.success) {
          setError(res.error ?? 'Delete failed')
          setEntries(prevEntries)
        }
      } catch {
        setError('Delete failed. Please try again.')
        setEntries(prevEntries)
      }
    })
  }

  function handleMoveUp(idx: number) {
    if (idx === 0) return
    const updated = [...entries]
    ;[updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]]
    setEntries(updated)
    const ids = updated.map((e) => e.id)
    startTransition(async () => {
      const res = await reorderWorkHistoryEntries(ids)
      if (!res.success) setError('Reorder failed')
    })
  }

  function handleMoveDown(idx: number) {
    if (idx === entries.length - 1) return
    const updated = [...entries]
    ;[updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]]
    setEntries(updated)
    const ids = updated.map((e) => e.id)
    startTransition(async () => {
      const res = await reorderWorkHistoryEntries(ids)
      if (!res.success) setError('Reorder failed')
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {entries.length === 0 && !editing && (
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-8 text-center">
          <p className="text-stone-400 text-sm">No career entries yet.</p>
          <p className="text-stone-500 text-xs mt-1">
            Add roles, positions, and career milestones to display on your public profile.
          </p>
        </div>
      )}

      {entries.map((entry, idx) => (
        <div key={entry.id} className="rounded-xl border border-stone-700 bg-stone-900/60 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-stone-100 text-sm">{entry.role_title}</p>
                {!entry.is_public && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700">
                    Private
                  </span>
                )}
                {entry.is_current && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400 border border-emerald-800">
                    Current
                  </span>
                )}
              </div>
              <p className="text-stone-400 text-xs mt-0.5">{entry.organization_name}</p>
              {(entry.start_date || entry.end_date || entry.is_current) && (
                <p className="text-stone-500 text-xs mt-0.5">
                  {formatDateRange(entry.start_date, entry.end_date, entry.is_current)}
                  {entry.location_label ? ` - ${entry.location_label}` : ''}
                </p>
              )}
              {entry.notable_credits.length > 0 && (
                <p className="text-xs text-stone-500 mt-1">
                  {entry.notable_credits.length} notable credit
                  {entry.notable_credits.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleMoveUp(idx)}
                disabled={idx === 0 || isPending}
                className="p-1.5 text-stone-500 hover:text-stone-300 disabled:opacity-30 transition-colors"
                title="Move up"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              </button>
              <button
                onClick={() => handleMoveDown(idx)}
                disabled={idx === entries.length - 1 || isPending}
                className="p-1.5 text-stone-500 hover:text-stone-300 disabled:opacity-30 transition-colors"
                title="Move down"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <button
                onClick={() => openEdit(entry)}
                disabled={isPending}
                className="p-1.5 text-stone-400 hover:text-stone-200 disabled:opacity-30 transition-colors text-xs"
              >
                Edit
              </button>
              {deleteConfirm === entry.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={isPending}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-30"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="text-xs text-stone-500 hover:text-stone-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(entry.id)}
                  disabled={isPending}
                  className="p-1.5 text-stone-600 hover:text-red-400 disabled:opacity-30 transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {editing ? (
        <div className="rounded-xl border border-stone-600 bg-stone-900 p-5 space-y-4">
          <h3 className="font-semibold text-stone-100 text-sm">
            {editingId ? 'Edit entry' : 'Add entry'}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Role title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editing.role_title ?? ''}
                onChange={(e) => setEditing((p) => ({ ...p!, role_title: e.target.value }))}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:border-stone-500 focus:outline-none"
                placeholder="Executive Chef"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Organization <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editing.organization_name ?? ''}
                onChange={(e) => setEditing((p) => ({ ...p!, organization_name: e.target.value }))}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:border-stone-500 focus:outline-none"
                placeholder="Restaurant or company name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Location (optional)
              </label>
              <input
                type="text"
                value={editing.location_label ?? ''}
                onChange={(e) =>
                  setEditing((p) => ({ ...p!, location_label: e.target.value || null }))
                }
                className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:border-stone-500 focus:outline-none"
                placeholder="City, State"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_current ?? false}
                  onChange={(e) => {
                    setEditing((p) => ({
                      ...p!,
                      is_current: e.target.checked,
                      end_date: e.target.checked ? '' : p?.end_date,
                    }))
                  }}
                  className="rounded border-stone-600"
                />
                <span className="text-sm text-stone-300">Currently here</span>
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Start date</label>
              <input
                type="date"
                value={editing.start_date ?? ''}
                onChange={(e) => setEditing((p) => ({ ...p!, start_date: e.target.value || null }))}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-stone-500 focus:outline-none"
              />
            </div>
            {!editing.is_current && (
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">End date</label>
                <input
                  type="date"
                  value={editing.end_date ?? ''}
                  onChange={(e) => setEditing((p) => ({ ...p!, end_date: e.target.value || null }))}
                  className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-stone-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Summary</label>
            <textarea
              value={editing.summary ?? ''}
              onChange={(e) => setEditing((p) => ({ ...p!, summary: e.target.value || null }))}
              rows={3}
              className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:border-stone-500 focus:outline-none resize-none"
              placeholder="Brief description of the role and your work..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Notable credits</label>
            <input
              type="text"
              value={editing.notableCreditsText ?? ''}
              onChange={(e) => setEditing((p) => ({ ...p!, notableCreditsText: e.target.value }))}
              className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:border-stone-500 focus:outline-none"
              placeholder="Cooked for Mayor Walsh, Collaborated with Chef Keller (comma-separated)"
            />
            <p className="text-xs text-stone-600 mt-1">
              Comma-separated. Only public-safe credits you are comfortable displaying.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editing.is_public ?? true}
                onChange={(e) => setEditing((p) => ({ ...p!, is_public: e.target.checked }))}
                className="rounded border-stone-600"
              />
              <span className="text-sm text-stone-300">Show on public profile</span>
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={
                isPending ||
                !(editing.role_title ?? '').trim() ||
                !(editing.organization_name ?? '').trim()
              }
              className="px-4 py-2 bg-stone-100 text-stone-900 text-sm font-medium rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
            >
              {isPending ? 'Saving...' : editingId ? 'Save changes' : 'Add entry'}
            </button>
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-stone-400 text-sm hover:text-stone-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={openNew}
          disabled={isPending}
          className="w-full rounded-xl border border-dashed border-stone-700 py-4 text-sm text-stone-500 hover:text-stone-300 hover:border-stone-600 transition-colors"
        >
          + Add career entry
        </button>
      )}
    </div>
  )
}
