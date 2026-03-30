import { Card, CardContent } from '@/components/ui/card'

type NextRewardProps = {
  nextReward: {
    name: string
    pointsRequired: number
    pointsNeeded: number
  } | null
  currentPoints: number
}

export function NextRewardCard({ nextReward, currentPoints }: NextRewardProps) {
  if (!nextReward) return null

  const earned = nextReward.pointsRequired - nextReward.pointsNeeded
  const percent = Math.round((earned / Math.max(nextReward.pointsRequired, 1)) * 100)

  return (
    <Card className="border-brand-700 bg-brand-950/40">
      <CardContent className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-3">
          Next Reward
        </p>
        <p className="text-lg font-bold text-stone-100">
          {nextReward.name}
          <span className="text-sm font-normal text-stone-400 ml-2">
            ({nextReward.pointsRequired} pts)
          </span>
        </p>

        <div className="mt-4">
          <div className="h-3 w-full bg-stone-800 rounded-full overflow-hidden">
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-sm text-stone-400">
              {nextReward.pointsNeeded} more point{nextReward.pointsNeeded !== 1 ? 's' : ''} to go
            </p>
            <p className="text-sm font-medium text-brand-400">{percent}%</p>
          </div>
        </div>

        <p className="text-xs text-stone-500 mt-3">Book your next dinner to earn more points.</p>
      </CardContent>
    </Card>
  )
}
