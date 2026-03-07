'use client'

import { useState, useEffect, useTransition } from 'react'
import { getOpenTables, submitJoinRequest } from '@/lib/hub/open-table-actions'
import type { OpenTableCard } from '@/lib/hub/open-table-actions'
import { OpenTableOnboarding } from '@/components/open-tables/open-table-onboarding'

export function DiscoverClient() {
  const [tables, setTables] = useState<OpenTableCard[]>([])
  const [loading, setLoading] = useState(true)
  const [areaFilter, setAreaFilter] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [joinGroupId, setJoinGroupId] = useState<string | null>(null)
  const [joinForm, setJoinForm] = useState({ groupSize: 1, message: '', allergies: '' })
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    loadTables()
  }, [])

  async function loadTables() {
    try {
      const data = await getOpenTables(areaFilter ? { area: areaFilter } : undefined)
      setTables(data)
    } catch (err) {
      console.error('[discover] Failed to load tables:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleJoinRequest(groupId: string) {
    setJoinGroupId(groupId)
    setJoinForm({ groupSize: 1, message: '', allergies: '' })
  }

  function handleSubmitRequest() {
    if (!joinGroupId) return
    const previous = tables
    startTransition(async () => {
      try {
        await submitJoinRequest({
          group_id: joinGroupId,
          group_size: joinForm.groupSize,
          message: joinForm.message || undefined,
          allergies: joinForm.allergies
            ? joinForm.allergies.split(',').map((s) => s.trim())
            : undefined,
        })
        setJoinGroupId(null)
        await loadTables()
      } catch (err) {
        setTables(previous)
        alert(err instanceof Error ? err.message : 'Failed to submit request')
      }
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-display text-stone-100 mb-6">Discover Open Tables</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-stone-700/50 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-display text-stone-100 mb-2">Discover Open Tables</h1>
        <p className="text-stone-400">
          Find foodies near you and join their dinner circle. Your chef reviews every request.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Filter by area..."
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadTables()}
          className="px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 placeholder-stone-400 text-sm"
        />
        <button
          onClick={loadTables}
          className="px-4 py-2 bg-stone-600 text-stone-200 rounded-lg text-sm hover:bg-stone-500 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Table Cards */}
      {tables.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🍽</div>
          <h2 className="text-lg font-medium text-stone-200 mb-2">No open tables right now</h2>
          <p className="text-stone-400 text-sm max-w-md mx-auto">
            When other foodies in your chef's network open their dinner circles, you'll see them
            here. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tables.map((table) => (
            <div
              key={table.groupId}
              className="bg-stone-800 border border-stone-700 rounded-xl p-5 hover:border-stone-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-medium text-stone-100">
                    {table.emoji && <span className="mr-2">{table.emoji}</span>}
                    {table.name}
                  </h3>
                  <p className="text-sm text-stone-400">
                    {table.displayArea}
                    {table.eventDate && ` \u00B7 ${new Date(table.eventDate).toLocaleDateString()}`}
                  </p>
                </div>
              </div>

              {table.description && (
                <p className="text-sm text-stone-300 mb-3 italic">"{table.description}"</p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-3">
                {table.openSeats > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                    {table.openSeats} open {table.openSeats === 1 ? 'seat' : 'seats'}
                  </span>
                )}
                {table.displayVibe.map((v) => (
                  <span
                    key={v}
                    className="px-2 py-0.5 bg-stone-700 text-stone-300 text-xs rounded-full"
                  >
                    {v}
                  </span>
                ))}
                {table.dietaryTheme.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full"
                  >
                    {d}
                  </span>
                ))}
              </div>

              {joinGroupId === table.groupId ? (
                <div className="mt-3 space-y-3 border-t border-stone-700 pt-3">
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Group size</label>
                    <input
                      type="number"
                      min={1}
                      max={table.openSeats}
                      value={joinForm.groupSize}
                      onChange={(e) =>
                        setJoinForm((f) => ({ ...f, groupSize: parseInt(e.target.value) || 1 }))
                      }
                      className="w-20 px-2 py-1 bg-stone-700 border border-stone-600 rounded text-stone-100 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">
                      Tell the chef about your group
                    </label>
                    <textarea
                      value={joinForm.message}
                      onChange={(e) => setJoinForm((f) => ({ ...f, message: e.target.value }))}
                      placeholder="We're a group of friends who love Italian food..."
                      className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 text-sm placeholder-stone-500 resize-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">
                      Any allergies? (comma separated)
                    </label>
                    <input
                      type="text"
                      value={joinForm.allergies}
                      onChange={(e) => setJoinForm((f) => ({ ...f, allergies: e.target.value }))}
                      placeholder="nuts, shellfish"
                      className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 text-sm placeholder-stone-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmitRequest}
                      disabled={isPending}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
                    >
                      {isPending ? 'Sending...' : 'Send Request'}
                    </button>
                    <button
                      onClick={() => setJoinGroupId(null)}
                      className="px-4 py-2 bg-stone-700 text-stone-300 rounded-lg text-sm hover:bg-stone-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleJoinRequest(table.groupId)}
                  className="mt-2 w-full px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors"
                >
                  Request to Join
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showOnboarding && <OpenTableOnboarding onClose={() => setShowOnboarding(false)} />}
    </div>
  )
}
