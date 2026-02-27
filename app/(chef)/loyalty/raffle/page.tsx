import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getRaffleRounds } from '@/lib/raffle/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'
import { CreateRaffleForm } from './create-raffle-form'
import { RaffleRoundActions } from './raffle-round-actions'

export const metadata: Metadata = { title: 'Monthly Raffle - ChefFlow' }

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  drawing: 'warning',
  completed: 'default',
  cancelled: 'error',
}

export default async function RaffleAdminPage() {
  await requireChef()
  const rounds = await getRaffleRounds()

  const activeRound = rounds.find((r) => r.status === 'active')
  const pastRounds = rounds.filter((r) => r.status !== 'active')

  // Current month info for creating a new round
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Monthly Raffle</h1>
          <p className="text-stone-400 mt-1">
            Create monthly prize drawings for your clients. Clients earn entries by playing games.
          </p>
        </div>
        <Link href="/loyalty">
          <Button variant="ghost">&larr; Back to Loyalty</Button>
        </Link>
      </div>

      {/* Active Round or Create New */}
      {activeRound ? (
        <Card className="border-brand-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🎟️</span>
                {activeRound.month_label}
              </CardTitle>
              <Badge variant="success">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Prize categories */}
            <div className="space-y-2">
              <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-400 mb-1">
                  🎲 Random Draw Prize
                </p>
                <p className="text-stone-100 font-medium">
                  {activeRound.prize_random_draw || activeRound.prize_description}
                </p>
              </div>
              {activeRound.prize_top_scorer && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-400 mb-1">
                    🏆 Top Scorer Prize
                  </p>
                  <p className="text-stone-100 font-medium">{activeRound.prize_top_scorer}</p>
                </div>
              )}
              {activeRound.prize_most_dedicated && (
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-orange-400 mb-1">
                    🔥 Most Dedicated Prize
                  </p>
                  <p className="text-stone-100 font-medium">{activeRound.prize_most_dedicated}</p>
                </div>
              )}
            </div>

            <div className="text-sm text-stone-400">
              <p>
                Round: {format(new Date(activeRound.month_start + 'T00:00:00'), 'MMM d')} –{' '}
                {format(new Date(activeRound.month_end + 'T00:00:00'), 'MMM d, yyyy')}
              </p>
              <p className="mt-1">
                The winner will be drawn automatically on{' '}
                {format(new Date(activeRound.month_end + 'T00:00:00'), 'MMMM d')}. No manual
                selection — the draw is fully automated and provably fair.
              </p>
            </div>

            <Link href={`/loyalty/raffle/${activeRound.id}`}>
              <Button variant="secondary" className="w-full">
                View Entries & Leaderboard
              </Button>
            </Link>

            <RaffleRoundActions round={activeRound} />
          </CardContent>
        </Card>
      ) : (
        <CreateRaffleForm monthStart={monthStart} monthEnd={monthEnd} />
      )}

      {/* Past Rounds */}
      {pastRounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Raffles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastRounds.map((round) => (
                <div
                  key={round.id}
                  className="flex items-center justify-between py-3 border-b border-stone-800 last:border-b-0"
                >
                  <div>
                    <p className="font-medium text-stone-100">{round.month_label}</p>
                    <p className="text-sm text-stone-500 mt-0.5">{round.prize_description}</p>
                    {round.status === 'completed' && round.drawn_at && (
                      <div className="text-xs text-stone-500 mt-0.5 space-y-0.5">
                        <p>
                          Drawn {format(new Date(round.drawn_at), 'MMM d, yyyy')} ·{' '}
                          {round.total_entries_at_draw} entries · {round.total_participants_at_draw}{' '}
                          participants
                        </p>
                        <p>
                          🎲 {round.winner_alias} Player
                          {round.top_scorer_alias && ` · 🏆 ${round.top_scorer_alias} Player`}
                          {round.most_dedicated_alias &&
                            ` · 🔥 ${round.most_dedicated_alias} Player`}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_BADGE[round.status] || 'default'}>{round.status}</Badge>
                    {round.status === 'completed' && (
                      <Link href={`/loyalty/raffle/${round.id}`}>
                        <Button variant="ghost" size="sm">
                          Details
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-stone-400 space-y-2">
          <p>
            <strong className="text-stone-200">1. You set the prizes</strong> — Set a random draw
            prize, plus optional bonus prizes for Top Scorer and Most Dedicated player.
          </p>
          <p>
            <strong className="text-stone-200">2. Clients play to enter</strong> — Clients play a
            quick game on their rewards page. Each play earns 1 raffle entry per day. They can
            replay to improve their leaderboard score.
          </p>
          <p>
            <strong className="text-stone-200">3. Three ways to win</strong> — 🎲 Random Draw
            (luck), 🏆 Top Scorer (skill), 🔥 Most Dedicated (consistency). Clients have three
            reasons to come back.
          </p>
          <p>
            <strong className="text-stone-200">4. Anonymous leaderboard</strong> — Clients see food
            emoji aliases (no real names). Your admin view shows real client names.
          </p>
          <p>
            <strong className="text-stone-200">5. Automated &amp; provably fair</strong> — The draw
            runs automatically on the 1st of each month. A cryptographic seed is published so
            everyone can verify.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
