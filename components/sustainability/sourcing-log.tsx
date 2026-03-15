'use client'

import { useState, useTransition } from 'react'
import {
  addSourcingEntry,
  deleteSourcingEntry,
  SOURCE_TYPE_LABELS,
  type SourcingEntry,
  type SourcingEntryInput,
  type SourceType,
} from '@/lib/sustainability/sourcing-actions'

const SOURCE_TYPES: SourceType[] = [
  'local_farm',
  'farmers_market',
  'organic',
  'conventional',
  'imported',
  'foraged',
  'garden',
  'specialty',
]

const EMPTY_FORM: SourcingEntryInput = {
  ingredient_name: '',
  source_type: 'local_farm',
  source_name: null,
  distance_miles: null,
  cost_cents: null,
  weight_lbs: null,
  is_organic: false,
  is_local: true,
  notes: null,
}

export function SourcingLog({
  initialEntries,
  eventId,
}: {
  initialEntries: SourcingEntry[]
  eventId?: string
}) {
  const [entries, setEntries] = useState<SourcingEntry[]>(initialEntries)
  const [form, setForm] = useState<SourcingEntryInput>({ ...EMPTY_FORM, event_id: eventId })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [quickMode, setQuickMode] = useState(false)
  const [filter, setFilter] = useState<SourceType | 'all'>('all')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.ingredient_name.trim()) return

    setError(null)
    const previousEntries = [...entries]

    startTransition(async () => {
      try {
        await addSourcingEntry(form)
        // Optimistic: add to top of list
        const optimistic: SourcingEntry = {
          ...form,
          id: crypto.randomUUID(),
          chef_id: '',
          created_at: new Date().toISOString(),
          entry_date: form.entry_date || new Date().toISOString().split('T')[0],
        }
        setEntries((prev) => [optimistic, ...prev])
        // Reset form but keep source type and event in quick mode
        if (quickMode) {
          setForm((prev) => ({
            ...EMPTY_FORM,
            source_type: prev.source_type,
            source_name: prev.source_name,
            event_id: eventId,
            is_local: prev.is_local,
            is_organic: prev.is_organic,
          }))
        } else {
          setForm({ ...EMPTY_FORM, event_id: eventId })
        }
      } catch (err) {
        setEntries(previousEntries)
        setError(err instanceof Error ? err.message : 'Failed to add entry')
      }
    })
  }

  function handleDelete(id: string) {
    setError(null)
    const previousEntries = [...entries]
    setEntries((prev) => prev.filter((e) => e.id !== id))

    startTransition(async () => {
      try {
        await deleteSourcingEntry(id)
      } catch (err) {
        setEntries(previousEntries)
        setError(err instanceof Error ? err.message : 'Failed to delete entry')
      }
    })
  }

  const filteredEntries =
    filter === 'all' ? entries : entries.filter((e) => e.source_type === filter)

  return (
    <div className="space-y-6">
      {/* Add Entry Form */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Log Ingredient Source
          </h3>
          <button
            type="button"
            onClick={() => setQuickMode(!quickMode)}
            className={`rounded px-2 py-1 text-xs font-medium transition ${
              quickMode
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
            }`}
          >
            {quickMode ? 'Quick Add: ON' : 'Quick Add: OFF'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Ingredient name */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Ingredient *
              </label>
              <input
                type="text"
                value={form.ingredient_name}
                onChange={(e) => setForm({ ...form, ingredient_name: e.target.value })}
                placeholder="e.g. Heirloom Tomatoes"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                required
                autoFocus
              />
            </div>

            {/* Source type */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Source Type *
              </label>
              <select
                value={form.source_type}
                onChange={(e) => {
                  const st = e.target.value as SourceType
                  const isLocal = ['local_farm', 'farmers_market', 'foraged', 'garden'].includes(st)
                  const isOrganic = st === 'organic'
                  setForm({ ...form, source_type: st, is_local: isLocal, is_organic: isOrganic })
                }}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                {SOURCE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {SOURCE_TYPE_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>

            {/* Source name */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Source Name
              </label>
              <input
                type="text"
                value={form.source_name || ''}
                onChange={(e) => setForm({ ...form, source_name: e.target.value || null })}
                placeholder="e.g. Smith Family Farm"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>

            {/* Distance */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Distance (miles)
              </label>
              <input
                type="number"
                min="0"
                value={form.distance_miles ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    distance_miles: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="0"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Weight (lbs)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.weight_lbs ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    weight_lbs: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="0.00"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>

            {/* Cost */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Cost ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cost_cents != null ? (form.cost_cents / 100).toFixed(2) : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cost_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null,
                  })
                }
                placeholder="0.00"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Toggles row */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={form.is_local ?? false}
                onChange={(e) => setForm({ ...form, is_local: e.target.checked })}
                className="rounded border-zinc-300"
              />
              Local
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={form.is_organic ?? false}
                onChange={(e) => setForm({ ...form, is_organic: e.target.checked })}
                className="rounded border-zinc-300"
              />
              Organic
            </label>
          </div>

          {error && (
            <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !form.ingredient_name.trim()}
            className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? 'Adding...' : 'Add Entry'}
          </button>
        </form>
      </div>

      {/* Entries Table */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-700">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Recent Entries ({filteredEntries.length})
          </h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as SourceType | 'all')}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
          >
            <option value="all">All Sources</option>
            {SOURCE_TYPES.map((st) => (
              <option key={st} value={st}>
                {SOURCE_TYPE_LABELS[st]}
              </option>
            ))}
          </select>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No sourcing entries yet. Log your first ingredient above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Ingredient</th>
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Supplier</th>
                  <th className="px-4 py-2 text-right">Miles</th>
                  <th className="px-4 py-2 text-right">Weight</th>
                  <th className="px-4 py-2 text-center">Tags</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-zinc-50 hover:bg-zinc-50 dark:border-zinc-700/50 dark:hover:bg-zinc-700/30"
                  >
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {entry.entry_date}
                    </td>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      {entry.ingredient_name}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {SOURCE_TYPE_LABELS[entry.source_type as SourceType] || entry.source_type}
                    </td>
                    <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                      {entry.source_name || '-'}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400">
                      {entry.distance_miles != null ? `${entry.distance_miles} mi` : '-'}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400">
                      {entry.weight_lbs != null ? `${entry.weight_lbs} lbs` : '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="inline-flex gap-1">
                        {entry.is_local && (
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Local
                          </span>
                        )}
                        {entry.is_organic && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Organic
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={isPending}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
