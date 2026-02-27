'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DrawReceipt } from '@/lib/raffle/actions'
import { WINNER_CATEGORIES } from '@/lib/raffle/constants'

type Props = {
  receipt: DrawReceipt
}

export function RaffleDrawReceipt({ receipt }: Props) {
  const drawDate = new Date(receipt.drawn_at)
  const formattedDate = drawDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  const hasMultiWinners = receipt.winners && receipt.winners.length > 0
  const myWins = hasMultiWinners ? receipt.winners.filter((w) => w.is_you) : []

  return (
    <Card
      className={
        receipt.is_you_winner ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-stone-700'
      }
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="text-xl">{receipt.is_you_winner ? '🎉' : '📋'}</span>
            {receipt.is_you_winner ? 'You Won!' : 'Draw Results'}
          </CardTitle>
          <Badge variant={receipt.is_you_winner ? 'success' : 'default'}>Completed</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Winner celebration */}
        {receipt.is_you_winner && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center space-y-1">
            <p className="text-emerald-300 font-semibold">
              Congratulations!{' '}
              {myWins.length > 1 ? `You won ${myWins.length} prizes!` : 'You won the raffle!'}
            </p>
            {myWins.map((w) => (
              <p key={w.category} className="text-sm text-stone-300">
                {WINNER_CATEGORIES[w.category].emoji} {WINNER_CATEGORIES[w.category].label}:{' '}
                {w.prize_description}
              </p>
            ))}
            {/* Fallback for old receipts without winners array */}
            {myWins.length === 0 && (
              <p className="text-sm text-stone-300">Prize: {receipt.prize_description}</p>
            )}
          </div>
        )}

        {/* Multi-winner list */}
        {hasMultiWinners ? (
          <div className="space-y-2">
            {receipt.winners.map((w) => (
              <div
                key={w.category}
                className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                  w.is_you ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-stone-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{WINNER_CATEGORIES[w.category].emoji}</span>
                  <div>
                    <p className="text-stone-200 font-medium">
                      {WINNER_CATEGORIES[w.category].label}
                    </p>
                    <p className="text-xs text-stone-500">{w.detail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-stone-200">
                    {w.alias} Player
                    {w.is_you && <span className="text-emerald-400 ml-1">(You!)</span>}
                  </p>
                  <p className="text-xs text-stone-500">{w.prize_description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Fallback for old receipts — single winner display */
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-stone-500 text-xs">Winner</p>
              <p className="text-stone-200 font-medium">
                {receipt.winner_alias} Player
                {receipt.is_you_winner && <span className="text-emerald-400 ml-1">(You!)</span>}
              </p>
            </div>
            <div>
              <p className="text-stone-500 text-xs">Prize</p>
              <p className="text-stone-200">{receipt.prize_description}</p>
            </div>
          </div>
        )}

        {/* Draw stats */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-stone-500 text-xs">Drawn</p>
            <p className="text-stone-200">{formattedDate}</p>
          </div>
          <div>
            <p className="text-stone-500 text-xs">Total Entries</p>
            <p className="text-stone-200 font-mono">{receipt.total_entries}</p>
          </div>
          <div>
            <p className="text-stone-500 text-xs">Participants</p>
            <p className="text-stone-200 font-mono">{receipt.total_participants}</p>
          </div>
        </div>

        {/* Provably fair seed */}
        <details className="text-xs">
          <summary className="cursor-pointer text-stone-500 hover:text-stone-400">
            Provably fair — view draw seed
          </summary>
          <div className="mt-2 rounded bg-stone-800 p-2 font-mono text-stone-400 break-all">
            {receipt.draw_seed}
          </div>
          <p className="text-stone-600 mt-1">
            This cryptographic seed was used to randomly select the draw winner. The draw is fully
            automated — no one can influence the result.
          </p>
        </details>
      </CardContent>
    </Card>
  )
}
