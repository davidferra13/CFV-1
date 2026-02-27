'use client'

import type { LeaderboardEntry } from '@/lib/raffle/actions'

type Props = {
  entries: LeaderboardEntry[]
  hasBonusPrizes?: boolean
}

export function RaffleLeaderboard({ entries, hasBonusPrizes }: Props) {
  if (entries.length === 0) return null

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-300 mb-2 flex items-center gap-1.5">
        <span>🏆</span> Leaderboard
      </h3>
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700 text-stone-400">
              <th className="py-2 px-3 text-left font-medium">#</th>
              <th className="py-2 px-3 text-left font-medium">Player</th>
              <th className="py-2 px-3 text-right font-medium">Best Score</th>
              <th className="py-2 px-3 text-right font-medium">Entries</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr
                key={`${entry.alias_emoji}-${i}`}
                className={`border-b border-stone-700/50 last:border-b-0 ${
                  entry.is_you ? 'bg-brand-500/10' : ''
                }`}
              >
                <td className="py-2 px-3 text-stone-400">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </td>
                <td className="py-2 px-3 font-medium">
                  <span className="mr-1.5">{entry.alias_emoji}</span>
                  <span className={entry.is_you ? 'text-brand-400' : 'text-stone-300'}>
                    {entry.is_you ? 'You' : 'Player'}
                  </span>
                </td>
                <td className="py-2 px-3 text-right text-stone-200 font-mono">
                  {entry.best_score.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right text-stone-400">{entry.total_entries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-stone-500 mt-1.5 text-center">
        All players are anonymous. The random draw gives every entry equal odds.
        {hasBonusPrizes && ' Top Scorer and Most Dedicated prizes reward skill and consistency!'}
      </p>
    </div>
  )
}
