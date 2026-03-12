'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getChefOpenTables,
  getPendingRequests,
  reviewJoinRequest,
  getMatchSuggestions,
} from '@/lib/hub/open-table-actions'
import type {
  ChefOpenTableView,
  JoinRequestView,
  MatchSuggestion,
} from '@/lib/hub/open-table-actions'
import { toast } from 'sonner'

export function OpenTablesChefDashboard() {
  const [tables, setTables] = useState<ChefOpenTableView[]>([])
  const [requests, setRequests] = useState<JoinRequestView[]>([])
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'requests' | 'tables' | 'matchmaker'>('requests')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [t, r, s] = await Promise.all([
        getChefOpenTables(),
        getPendingRequests(),
        getMatchSuggestions(),
      ])
      setTables(t)
      setRequests(r)
      setSuggestions(s)
    } catch (err) {
      console.error('[open-tables] Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleReview(requestId: string, action: 'approved' | 'declined') {
    const previous = requests
    setRequests((r) => r.filter((req) => req.requestId !== requestId))

    startTransition(async () => {
      try {
        await reviewJoinRequest({
          request_id: requestId,
          action,
          decline_message:
            action === 'declined'
              ? "This particular table isn't the right fit right now, but we'll keep you in mind for future open tables!"
              : undefined,
        })
        await loadData()
      } catch (err) {
        setRequests(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to review request')
      }
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-display text-stone-100 mb-6">Open Tables</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-stone-700/50 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const pendingCount = requests.length

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display text-stone-100 mb-2">Open Tables</h1>
        <p className="text-stone-400">
          Manage discoverable dinner circles and review join requests from foodies.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-stone-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'requests'
              ? 'bg-stone-700 text-stone-100'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Requests
          {pendingCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-stone-900 text-xs rounded-full font-bold">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'tables'
              ? 'bg-stone-700 text-stone-100'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Active Tables ({tables.length})
        </button>
        <button
          onClick={() => setActiveTab('matchmaker')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'matchmaker'
              ? 'bg-stone-700 text-stone-100'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Matchmaker
          {suggestions.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-brand-500 text-white text-xs rounded-full font-bold">
              {suggestions.length}
            </span>
          )}
        </button>
      </div>

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-12 bg-stone-800 rounded-xl border border-stone-700">
              <div className="text-3xl mb-3">👋</div>
              <p className="text-stone-400">No pending requests right now</p>
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.requestId}
                className="bg-stone-800 border border-stone-700 rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-stone-100 font-medium">{req.requesterName}</h3>
                    {req.requesterEmail && (
                      <p className="text-xs text-stone-500">{req.requesterEmail}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-400">Wants to join</span>
                    <p className="text-sm text-stone-200 font-medium">{req.groupName}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-stone-700 text-stone-300 text-xs rounded-full">
                    {req.groupSize} {req.groupSize === 1 ? 'person' : 'people'}
                  </span>
                  {req.allergies.map((a) => (
                    <span
                      key={a}
                      className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full"
                    >
                      ⚠ {a}
                    </span>
                  ))}
                  {req.dietaryRestrictions.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full"
                    >
                      {d}
                    </span>
                  ))}
                </div>

                {req.message && (
                  <p className="text-sm text-stone-300 mb-4 italic bg-stone-700/30 rounded-lg p-3">
                    "{req.message}"
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(req.requestId, 'approved')}
                    disabled={isPending}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(req.requestId, 'declined')}
                    disabled={isPending}
                    className="px-4 py-2 bg-stone-700 text-stone-300 rounded-lg text-sm hover:bg-stone-600 transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Matchmaker Tab */}
      {activeTab === 'matchmaker' && (
        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-12 bg-stone-800 rounded-xl border border-stone-700">
              <div className="text-3xl mb-3">🔮</div>
              <h2 className="text-lg font-medium text-stone-200 mb-2">No matches yet</h2>
              <p className="text-stone-400 text-sm max-w-md mx-auto">
                When two or more open tables share similar vibes, area, or dietary preferences,
                potential matches will appear here for you to connect.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-stone-400 mb-2">
                These groups share similar interests. As their chef, you can connect them.
              </p>
              {suggestions.map((s, idx) => (
                <div key={idx} className="bg-stone-800 border border-stone-700 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 text-center">
                      <p className="text-stone-100 font-medium text-sm">{s.groupA.name}</p>
                      {s.groupA.area && <p className="text-xs text-stone-500">{s.groupA.area}</p>}
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center">
                        <span className="text-brand-400 text-sm font-bold">
                          {s.compatibilityScore}%
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 mt-1">match</span>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-stone-100 font-medium text-sm">{s.groupB.name}</p>
                      {s.groupB.area && <p className="text-xs text-stone-500">{s.groupB.area}</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {s.reasons.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-xs rounded-full"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Tables Tab */}
      {activeTab === 'tables' && (
        <div className="space-y-4">
          {tables.length === 0 ? (
            <div className="text-center py-12 bg-stone-800 rounded-xl border border-stone-700">
              <div className="text-3xl mb-3">🍽</div>
              <p className="text-stone-400">
                No open tables yet. When your clients open their dinner circles, they'll appear
                here.
              </p>
            </div>
          ) : (
            tables.map((table) => (
              <div
                key={table.groupId}
                className="bg-stone-800 border border-stone-700 rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-stone-100 font-medium">
                      {table.emoji && <span className="mr-1">{table.emoji}</span>}
                      {table.name}
                    </h3>
                    {table.displayArea && (
                      <p className="text-xs text-stone-500">{table.displayArea}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {table.pendingRequests > 0 && (
                      <span className="px-2 py-0.5 bg-amber-500 text-stone-900 text-xs rounded-full font-bold">
                        {table.pendingRequests} pending
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        table.consentStatus === 'ready'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : table.consentStatus === 'blocked'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {table.consentStatus === 'ready'
                        ? 'Live'
                        : table.consentStatus === 'blocked'
                          ? 'Blocked'
                          : 'Pending consent'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {table.openSeats !== null && (
                    <span className="px-2 py-0.5 bg-stone-700 text-stone-300 text-xs rounded-full">
                      {table.openSeats} open seats
                    </span>
                  )}
                  {table.displayVibe.map((v) => (
                    <span
                      key={v}
                      className="px-2 py-0.5 bg-stone-700 text-stone-400 text-xs rounded-full"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
