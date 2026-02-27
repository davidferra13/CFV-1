'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RaffleGameModal } from './raffle-game-modal'
import { RaffleLeaderboard } from './raffle-leaderboard'
import { RaffleDrawReceipt } from './raffle-draw-receipt'
import type { RaffleRound, LeaderboardEntry, DrawReceipt } from '@/lib/raffle/actions'

type Props = {
  round: RaffleRound | null
  myEntries: number
  myAlias: string | null
  hasEntryToday: boolean
  totalEntries: number
  leaderboard: LeaderboardEntry[]
  lastDrawReceipt: DrawReceipt | null
}

export function RaffleSection({
  round,
  myEntries,
  myAlias,
  hasEntryToday,
  totalEntries,
  leaderboard,
  lastDrawReceipt,
}: Props) {
  const [showGame, setShowGame] = useState(false)
  const [localEntries, setLocalEntries] = useState(myEntries)
  const [localAlias, setLocalAlias] = useState(myAlias)
  const [localHasEntry, setLocalHasEntry] = useState(hasEntryToday)
  const [localTotal, setLocalTotal] = useState(totalEntries)
  const router = useRouter()

  // Nothing to show — no active raffle and no recent draw receipt
  if (!round && !lastDrawReceipt) return null

  const handleEntryEarned = (newTotal: number, alias: string) => {
    if (!localHasEntry) {
      setLocalEntries((prev) => prev + 1)
    }
    setLocalTotal(newTotal)
    setLocalAlias(alias)
    setLocalHasEntry(true)
    router.refresh()
  }

  return (
    <>
      {/* Active raffle card */}
      {round && (
        <Card className="border-brand-500/30 bg-gradient-to-br from-brand-500/5 to-amber-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🎟️</span>
                Monthly Raffle
              </CardTitle>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="text-sm text-stone-400 mt-1">{round.month_label}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Prizes */}
            <div className="space-y-2">
              <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-400 mb-1">
                  🎲 Random Draw Prize
                </p>
                <p className="text-stone-100 font-medium">
                  {round.prize_random_draw || round.prize_description}
                </p>
              </div>
              {round.prize_top_scorer && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-400 mb-1">
                    🏆 Top Scorer Prize
                  </p>
                  <p className="text-stone-100 font-medium">{round.prize_top_scorer}</p>
                </div>
              )}
              {round.prize_most_dedicated && (
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-orange-400 mb-1">
                    🔥 Most Dedicated Prize
                  </p>
                  <p className="text-stone-100 font-medium">{round.prize_most_dedicated}</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-stone-100">{localEntries}</p>
                <p className="text-xs text-stone-400">Your Entries</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-100">{localTotal}</p>
                <p className="text-xs text-stone-400">Total Entries</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-100">{localAlias || '—'}</p>
                <p className="text-xs text-stone-400">Your Alias</p>
              </div>
            </div>

            {/* Play button — always available */}
            <button
              type="button"
              onClick={() => setShowGame(true)}
              className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              {localHasEntry ? 'Play Again (Improve Your Score)' : 'Play Snake to Earn an Entry'}
            </button>
            {localHasEntry && (
              <p className="text-xs text-stone-500 text-center -mt-2">
                Today&apos;s entry earned. Play to beat your high score on the leaderboard!
              </p>
            )}

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <RaffleLeaderboard
                entries={leaderboard}
                hasBonusPrizes={!!(round.prize_top_scorer || round.prize_most_dedicated)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Last draw receipt (show even if no active round) */}
      {lastDrawReceipt && <RaffleDrawReceipt receipt={lastDrawReceipt} />}

      {/* Game modal */}
      {showGame && round && (
        <RaffleGameModal
          roundId={round.id}
          onClose={() => setShowGame(false)}
          onEntryEarned={handleEntryEarned}
        />
      )}
    </>
  )
}
