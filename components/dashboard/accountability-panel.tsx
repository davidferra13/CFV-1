// AccountabilityPanel — Dashboard widget for weekly operational accountability.
// Shows events completed, follow-ups sent, receipts uploaded, closures on-time.
// Also displays closure streak with flame emoji milestone celebration.

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WeeklyAccountabilityStats } from '@/lib/dashboard/accountability'
import type { ClosureStreakData } from '@/lib/chefs/streaks'

type Props = {
  weeklyStats: WeeklyAccountabilityStats
  closureStreak: ClosureStreakData
  overdueFollowUpCount: number
}

export function AccountabilityPanel({ weeklyStats, closureStreak, overdueFollowUpCount }: Props) {
  const {
    eventsCompletedThisWeek,
    followUpsSentThisWeek,
    receiptsUploadedThisWeek,
    closedOnTimeCount,
  } = weeklyStats

  // Nothing to show — no events completed this week
  if (
    eventsCompletedThisWeek === 0 &&
    overdueFollowUpCount === 0 &&
    closureStreak.currentStreak < 2
  ) {
    return null
  }

  const followUpRatio =
    eventsCompletedThisWeek > 0 ? followUpsSentThisWeek / eventsCompletedThisWeek : 1
  const followUpHealthy = followUpRatio >= 1
  const followUpWarning = followUpRatio > 0 && followUpRatio < 1
  const followUpBad = followUpRatio === 0 && eventsCompletedThisWeek > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>This Week</CardTitle>
          {closureStreak.currentStreak >= 2 && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-lg" aria-hidden="true">
                🔥
              </span>
              <span className="font-semibold text-stone-200">
                {closureStreak.currentStreak} in a row on time
              </span>
              {closureStreak.milestoneMessage && (
                <span className="text-xs text-emerald-600 font-medium hidden sm:inline">
                  — {closureStreak.milestoneMessage}
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Events completed */}
          <div>
            <p className="text-2xl font-bold text-stone-100">{eventsCompletedThisWeek}</p>
            <p className="text-xs text-stone-500 mt-0.5">events completed</p>
          </div>

          {/* Follow-ups sent ratio */}
          <div>
            <p
              className={`text-2xl font-bold ${
                followUpHealthy
                  ? 'text-emerald-600'
                  : followUpWarning
                    ? 'text-amber-600'
                    : followUpBad
                      ? 'text-red-600'
                      : 'text-stone-100'
              }`}
            >
              {followUpsSentThisWeek}/{eventsCompletedThisWeek}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">follow-ups sent</p>
            {followUpBad && eventsCompletedThisWeek > 0 && (
              <Link
                href="/clients/communication/follow-ups"
                className="text-xs text-red-600 hover:underline"
              >
                Send now →
              </Link>
            )}
          </div>

          {/* Closed on time */}
          <div>
            <p className="text-2xl font-bold text-stone-100">{closedOnTimeCount}</p>
            <p className="text-xs text-stone-500 mt-0.5">closed on time</p>
          </div>

          {/* Receipts uploaded */}
          <div>
            <p
              className={`text-2xl font-bold ${receiptsUploadedThisWeek > 0 ? 'text-stone-100' : 'text-stone-400'}`}
            >
              {receiptsUploadedThisWeek}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">receipts uploaded</p>
          </div>
        </div>

        {/* Overdue follow-up alert */}
        {overdueFollowUpCount > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-md bg-amber-950 border border-amber-200 px-3 py-2">
            <p className="text-sm text-amber-200 font-medium">
              {overdueFollowUpCount} follow-up{overdueFollowUpCount !== 1 ? 's' : ''} overdue
            </p>
            <Link
              href="/clients/communication/follow-ups"
              className="text-xs text-amber-200 hover:text-amber-900 font-semibold"
            >
              Review →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
