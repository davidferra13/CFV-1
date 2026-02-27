import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getRaffleRoundDetail } from '@/lib/raffle/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import Link from 'next/link'
import { format } from 'date-fns'
import { RaffleRoundActions } from '../raffle-round-actions'

export const metadata: Metadata = { title: 'Raffle Details - ChefFlow' }

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  drawing: 'warning',
  completed: 'default',
  cancelled: 'error',
}

export default async function RaffleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireChef()
  const { id } = await params
  const {
    round,
    entries,
    totalEntries,
    uniqueParticipants,
    winnerName,
    topScorerName,
    mostDedicatedName,
  } = await getRaffleRoundDetail(id)

  if (!round) {
    return (
      <div className="space-y-4">
        <Link href="/loyalty/raffle">
          <Button variant="ghost">&larr; Back to Raffle</Button>
        </Link>
        <Alert variant="error">Raffle round not found.</Alert>
      </div>
    )
  }

  // Build leaderboard from entries (best score per client)
  const clientBest = new Map<
    string,
    { name: string; alias: string; score: number; entries: number }
  >()
  for (const e of entries) {
    const existing = clientBest.get(e.client_id)
    if (!existing || e.game_score > existing.score) {
      clientBest.set(e.client_id, {
        name: e.client_name,
        alias: e.alias_emoji,
        score: e.game_score,
        entries: (existing?.entries || 0) + 1,
      })
    } else {
      existing.entries++
    }
  }

  const leaderboard = Array.from(clientBest.entries()).sort(([, a], [, b]) => b.score - a.score)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">{round.month_label} Raffle</h1>
          <p className="text-stone-400 mt-1">{round.prize_description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_BADGE[round.status] || 'default'}>{round.status}</Badge>
          <Link href="/loyalty/raffle">
            <Button variant="ghost">&larr; Back</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-stone-500">Total Entries</p>
            <p className="text-3xl font-bold text-stone-100 mt-2">{totalEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-stone-500">Participants</p>
            <p className="text-3xl font-bold text-stone-100 mt-2">{uniqueParticipants}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-stone-500">Avg Entries/Player</p>
            <p className="text-3xl font-bold text-stone-100 mt-2">
              {uniqueParticipants > 0 ? (totalEntries / uniqueParticipants).toFixed(1) : '0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Winners section (completed rounds) */}
      {round.status === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Random Draw Winner */}
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="pt-6 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                🎲 Random Draw
              </p>
              <p className="text-xl font-bold text-stone-100">{winnerName || '—'}</p>
              {round.winner_alias && (
                <p className="text-sm text-stone-400">{round.winner_alias} Player</p>
              )}
              <p className="text-xs text-stone-500">
                {round.prize_random_draw || round.prize_description}
              </p>
              <RaffleRoundActions round={round} category="random" />
            </CardContent>
          </Card>

          {/* Top Scorer Winner */}
          {round.prize_top_scorer && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-6 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-amber-400">
                  🏆 Top Scorer
                </p>
                <p className="text-xl font-bold text-stone-100">{topScorerName || '—'}</p>
                {round.top_scorer_alias && (
                  <p className="text-sm text-stone-400">
                    {round.top_scorer_alias} Player · Score:{' '}
                    {(round.top_scorer_score || 0).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-stone-500">{round.prize_top_scorer}</p>
                <RaffleRoundActions round={round} category="top_scorer" />
              </CardContent>
            </Card>
          )}

          {/* Most Dedicated Winner */}
          {round.prize_most_dedicated && (
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardContent className="pt-6 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-orange-400">
                  🔥 Most Dedicated
                </p>
                <p className="text-xl font-bold text-stone-100">{mostDedicatedName || '—'}</p>
                {round.most_dedicated_alias && (
                  <p className="text-sm text-stone-400">
                    {round.most_dedicated_alias} Player · {round.most_dedicated_entry_count} days
                    played
                  </p>
                )}
                <p className="text-xs text-stone-500">{round.prize_most_dedicated}</p>
                <RaffleRoundActions round={round} category="most_dedicated" />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Draw details — seed + timestamp (completed rounds) */}
      {round.status === 'completed' && round.drawn_at && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Draw Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-stone-500 text-xs">Drawn</p>
                <p className="text-stone-200">
                  {format(new Date(round.drawn_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <div>
                <p className="text-stone-500 text-xs">Entries at Draw</p>
                <p className="text-stone-200 font-mono">{round.total_entries_at_draw}</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs">Participants</p>
                <p className="text-stone-200 font-mono">{round.total_participants_at_draw}</p>
              </div>
            </div>
            {round.draw_seed && (
              <details className="text-xs">
                <summary className="cursor-pointer text-stone-500 hover:text-stone-400">
                  Draw seed (provably fair)
                </summary>
                <div className="mt-2 rounded bg-stone-800 p-2 font-mono text-stone-400 break-all">
                  {round.draw_seed}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard (chef sees real names) */}
      {leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-stone-400">
                  <th className="py-2 px-3 text-left font-medium">#</th>
                  <th className="py-2 px-3 text-left font-medium">Client</th>
                  <th className="py-2 px-3 text-left font-medium">Alias</th>
                  <th className="py-2 px-3 text-right font-medium">Best Score</th>
                  <th className="py-2 px-3 text-right font-medium">Entries</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map(([clientId, data], i) => {
                  const isRandomWinner = clientId === round.winner_client_id
                  const isTopScorer = clientId === round.top_scorer_client_id
                  const isMostDedicated = clientId === round.most_dedicated_client_id
                  const highlight = isRandomWinner
                    ? 'bg-emerald-500/10'
                    : isTopScorer
                      ? 'bg-amber-500/10'
                      : isMostDedicated
                        ? 'bg-orange-500/10'
                        : ''
                  return (
                    <tr
                      key={clientId}
                      className={`border-b border-stone-700/50 last:border-b-0 ${highlight}`}
                    >
                      <td className="py-2 px-3 text-stone-400">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                      </td>
                      <td className="py-2 px-3">
                        <Link
                          href={`/clients/${clientId}`}
                          className="font-medium text-stone-200 hover:text-brand-500"
                        >
                          {data.name}
                        </Link>
                        {isRandomWinner && (
                          <span className="ml-1.5 text-xs text-emerald-400">🎲</span>
                        )}
                        {isTopScorer && <span className="ml-1.5 text-xs text-amber-400">🏆</span>}
                        {isMostDedicated && (
                          <span className="ml-1.5 text-xs text-orange-400">🔥</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-stone-400">{data.alias}</td>
                      <td className="py-2 px-3 text-right text-stone-200 font-mono">
                        {data.score.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-stone-400">{data.entries}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Actions (for active rounds — cancel) */}
      {round.status === 'active' && <RaffleRoundActions round={round} />}
    </div>
  )
}
