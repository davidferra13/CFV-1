'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  createRaffle,
  getRaffles,
  getCurrentRaffle,
  getEligibleEntries,
  drawWinner,
} from '@/lib/loyalty/raffle-actions'
import type { RaffleRound, EligibleEntry } from '@/lib/loyalty/raffle-actions'

export function RaffleManagement() {
  const [raffles, setRaffles] = useState<RaffleRound[]>([])
  const [currentRaffle, setCurrentRaffle] = useState<RaffleRound | null>(null)
  const [entries, setEntries] = useState<EligibleEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showConfirmDraw, setShowConfirmDraw] = useState(false)

  // Create raffle form state
  const [formName, setFormName] = useState('')
  const [formPrize, setFormPrize] = useState('')
  const [formMonth, setFormMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    startTransition(async () => {
      try {
        const [allRaffles, current] = await Promise.all([getRaffles(), getCurrentRaffle()])
        setRaffles(allRaffles)
        setCurrentRaffle(current)

        if (current) {
          const eligible = await getEligibleEntries(current.id)
          setEntries(eligible)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load raffles')
      }
    })
  }

  const handleCreate = () => {
    setError(null)
    setSuccess(null)
    if (!formPrize.trim()) {
      setError('Prize description is required.')
      return
    }

    startTransition(async () => {
      try {
        const result = await createRaffle({
          name: formName.trim() || 'Monthly Raffle',
          month: formMonth,
          prizeDescription: formPrize,
        })
        if (result.success) {
          setSuccess('Raffle created successfully!')
          setFormName('')
          setFormPrize('')
          loadData()
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create raffle')
      }
    })
  }

  const handleDraw = () => {
    if (!currentRaffle) return
    setError(null)
    setSuccess(null)
    setShowConfirmDraw(false)

    startTransition(async () => {
      try {
        const result = await drawWinner(currentRaffle.id)
        if (result.success) {
          setSuccess(`Winner drawn: ${result.winnerName}!`)
          loadData()
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to draw winner')
      }
    })
  }

  const pastRaffles = raffles.filter((r) => r.status !== 'active')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Monthly Raffle</h1>
        <p className="text-stone-400 mt-1">
          Create monthly prize drawings for your clients. Clients earn entries by engaging with your
          business.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-4 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* Current Raffle or Create New */}
      {currentRaffle ? (
        <div className="rounded-lg border border-amber-500/30 bg-stone-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-stone-100">{currentRaffle.month_label}</h2>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
              Active
            </span>
          </div>

          <div className="rounded-lg border border-stone-700 bg-stone-800 p-3">
            <p className="text-xs uppercase tracking-wider text-stone-500 mb-1">Prize</p>
            <p className="text-stone-100 font-medium">{currentRaffle.prize_description}</p>
          </div>

          {/* Entries */}
          <div>
            <h3 className="text-sm font-medium text-stone-300 mb-2">
              Eligible Entries ({entries.length} participants)
            </h3>
            {entries.length === 0 ? (
              <p className="text-sm text-stone-500">No entries yet.</p>
            ) : (
              <div className="divide-y divide-stone-800 rounded-lg border border-stone-700">
                {entries.map((entry) => (
                  <div key={entry.clientId} className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{entry.aliasEmoji}</span>
                      <span className="text-sm text-stone-300">{entry.clientName}</span>
                    </div>
                    <div className="text-xs text-stone-500">
                      {entry.totalEntries} entries, best score: {entry.bestScore}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Draw Winner */}
          {entries.length > 0 && (
            <div>
              {showConfirmDraw ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                  <p className="text-sm text-stone-300">
                    Draw a winner from {entries.length} participants? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDraw}
                      disabled={isPending}
                      className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-amber-400 disabled:opacity-50"
                    >
                      {isPending ? 'Drawing...' : 'Confirm Draw'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDraw(false)}
                      className="rounded-md border border-stone-600 px-4 py-2 text-sm text-stone-300 hover:bg-stone-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmDraw(true)}
                  className="rounded-md bg-amber-500 px-6 py-2 text-sm font-medium text-stone-950 hover:bg-amber-400"
                >
                  Draw Winner
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Create New Raffle */
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-stone-100">Create New Raffle</h2>

          <label className="block text-sm text-stone-300">
            Name (optional)
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Monthly Raffle"
              className="mt-1 block w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            />
          </label>

          <label className="block text-sm text-stone-300">
            Month
            <input
              type="month"
              value={formMonth}
              onChange={(e) => setFormMonth(e.target.value)}
              className="mt-1 block w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            />
          </label>

          <label className="block text-sm text-stone-300">
            Prize Description *
            <textarea
              value={formPrize}
              onChange={(e) => setFormPrize(e.target.value)}
              placeholder="e.g. Free dinner for two, $50 credit toward next event..."
              rows={2}
              className="mt-1 block w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
            />
          </label>

          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending || !formPrize.trim()}
            className="rounded-md bg-amber-500 px-6 py-2 text-sm font-medium text-stone-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {isPending ? 'Creating...' : 'Create Raffle'}
          </button>
        </div>
      )}

      {/* Past Raffles */}
      {pastRaffles.length > 0 && (
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-6">
          <h2 className="text-lg font-semibold text-stone-100 mb-4">Past Raffles</h2>
          <div className="divide-y divide-stone-800">
            {pastRaffles.map((raffle) => (
              <div key={raffle.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-stone-100">{raffle.month_label}</p>
                  <p className="text-sm text-stone-500 mt-0.5">{raffle.prize_description}</p>
                  {raffle.status === 'completed' && raffle.winner_alias && (
                    <p className="text-xs text-stone-500 mt-0.5">
                      Winner: {raffle.winner_alias} ({raffle.total_entries_at_draw} entries,{' '}
                      {raffle.total_participants_at_draw} participants)
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    raffle.status === 'completed'
                      ? 'bg-stone-700 text-stone-300'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {raffle.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
