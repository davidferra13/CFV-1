'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createRaffleRound } from '@/lib/raffle/actions'

type Props = {
  monthStart: string
  monthEnd: string
}

export function CreateRaffleForm({ monthStart, monthEnd }: Props) {
  const [prize, setPrize] = useState('')
  const [prizeTopScorer, setPrizeTopScorer] = useState('')
  const [prizeMostDedicated, setPrizeMostDedicated] = useState('')
  const [showBonus, setShowBonus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const monthLabel = new Date(monthStart + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prize.trim()) return

    setError(null)
    startTransition(async () => {
      try {
        const result = await createRaffleRound({
          prizeDescription: prize.trim(),
          monthStart,
          monthEnd,
          prizeTopScorer: prizeTopScorer.trim() || undefined,
          prizeMostDedicated: prizeMostDedicated.trim() || undefined,
        })
        if (result.success) {
          router.refresh()
        } else {
          setError(result.error || 'Failed to create raffle.')
        }
      } catch {
        setError('Something went wrong.')
      }
    })
  }

  return (
    <Card className="border-dashed border-stone-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🎟️</span>
          Create {monthLabel} Raffle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="prize" className="block text-sm font-medium text-stone-300 mb-1.5">
              🎲 Random Draw Prize
            </label>
            <textarea
              id="prize"
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              placeholder="e.g. Free dessert course at your next event, $50 credit, Complimentary wine pairing..."
              rows={3}
              className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              required
            />
            <p className="text-xs text-stone-500 mt-1">
              One random entry wins this prize. Every entry has equal odds.
            </p>
          </div>

          {/* Bonus prizes — collapsible section */}
          {!showBonus ? (
            <button
              type="button"
              onClick={() => setShowBonus(true)}
              className="text-sm text-brand-500 hover:text-brand-400 transition-colors"
            >
              + Add bonus prizes (Top Scorer, Most Dedicated)
            </button>
          ) : (
            <div className="space-y-4 rounded-lg border border-stone-700 bg-stone-800/50 p-4">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                Bonus Prizes (optional)
              </p>

              <div>
                <label
                  htmlFor="prizeTopScorer"
                  className="block text-sm font-medium text-stone-300 mb-1.5"
                >
                  🏆 Top Scorer Prize
                </label>
                <textarea
                  id="prizeTopScorer"
                  value={prizeTopScorer}
                  onChange={(e) => setPrizeTopScorer(e.target.value)}
                  placeholder="e.g. Free appetizer course, Kitchen gadget, $25 credit..."
                  rows={2}
                  className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <p className="text-xs text-stone-500 mt-1">
                  Awarded to the player with the highest single game score this month.
                </p>
              </div>

              <div>
                <label
                  htmlFor="prizeMostDedicated"
                  className="block text-sm font-medium text-stone-300 mb-1.5"
                >
                  🔥 Most Dedicated Prize
                </label>
                <textarea
                  id="prizeMostDedicated"
                  value={prizeMostDedicated}
                  onChange={(e) => setPrizeMostDedicated(e.target.value)}
                  placeholder="e.g. Priority booking for next month, Special tasting menu, $25 credit..."
                  rows={2}
                  className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <p className="text-xs text-stone-500 mt-1">
                  Awarded to the player who played the most days this month.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-950/50 border border-red-800 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isPending || !prize.trim()}>
            {isPending ? 'Creating...' : 'Create Raffle'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
