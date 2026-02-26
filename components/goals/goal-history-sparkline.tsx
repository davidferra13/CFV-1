import type { GoalSnapshot } from '@/lib/goals/types'

interface GoalHistorySparklineProps {
  snapshots: GoalSnapshot[] // ordered oldest → newest
}

export function GoalHistorySparkline({ snapshots }: GoalHistorySparklineProps) {
  if (snapshots.length === 0) {
    return (
      <p className="text-sm text-stone-400 italic">
        No history yet — check back after the next cron run.
      </p>
    )
  }

  // Reverse so we show oldest → newest left to right
  const ordered = [...snapshots].reverse()

  return (
    <div className="flex items-end gap-1 h-12">
      {ordered.map((snap) => {
        const height = Math.min(100, Math.max(4, snap.progressPercent))
        const isOnTrack = snap.progressPercent >= 100
        return (
          <div
            key={snap.id}
            title={`${snap.snapshotMonth}: ${snap.progressPercent}%`}
            className={`flex-1 rounded-t ${isOnTrack ? 'bg-green-400' : 'bg-brand-400'} min-w-[4px]`}
            style={{ height: `${height}%` }}
          />
        )
      })}
    </div>
  )
}
