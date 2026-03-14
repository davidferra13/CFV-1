import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getBetaTesters, type BetaClientSummary } from '@/lib/beta/onboarding-actions'

/**
 * Chef dashboard widget showing beta tester overview.
 * Shows: total testers, checklist progress, who's stuck, recent completions.
 */
export async function BetaTestersWidget() {
  let testers: BetaClientSummary[] = []

  try {
    testers = await getBetaTesters()
  } catch {
    return null // silently hide if no beta testers or error
  }

  if (testers.length === 0) return null

  const totalTesters = testers.length
  const allComplete = testers.filter((t) => t.stepsCompleted === t.totalSteps).length
  const inProgress = testers.filter(
    (t) => t.stepsCompleted > 0 && t.stepsCompleted < t.totalSteps
  ).length
  const notStarted = testers.filter((t) => t.stepsCompleted === 0).length
  const avgProgress = Math.round(
    testers.reduce((sum, t) => sum + (t.stepsCompleted / t.totalSteps) * 100, 0) / totalTesters
  )

  return (
    <Card className="border-stone-700 bg-stone-900/60">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-200">Beta Program</h3>
            <p className="text-xs text-stone-500">{totalTesters} testers enrolled</p>
          </div>
          <Link href="/admin/beta">
            <Button variant="ghost" size="sm" className="text-xs">
              View All
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-3 text-center">
            <p className="text-lg font-bold text-stone-100">{totalTesters}</p>
            <p className="text-[10px] text-stone-500">Total</p>
          </div>
          <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{allComplete}</p>
            <p className="text-[10px] text-stone-500">Complete</p>
          </div>
          <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3 text-center">
            <p className="text-lg font-bold text-amber-400">{inProgress}</p>
            <p className="text-[10px] text-stone-500">In Progress</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-3 text-center">
            <p className="text-lg font-bold text-stone-400">{notStarted}</p>
            <p className="text-[10px] text-stone-500">Not Started</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs text-stone-400">
            <span>Average progress</span>
            <span>{avgProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        </div>

        {/* Testers who need attention (not started or stuck early) */}
        {notStarted > 0 && (
          <div className="rounded border border-stone-700 bg-stone-800/40 p-2">
            <p className="text-xs text-stone-400">
              {notStarted} {notStarted === 1 ? 'tester has' : 'testers have'} not started the
              checklist yet. Consider reaching out.
            </p>
          </div>
        )}

        {/* Recent progress */}
        <div className="mt-3 space-y-1.5">
          {testers.slice(0, 3).map((t) => (
            <div key={t.clientId} className="flex items-center justify-between text-xs">
              <span className="text-stone-300 truncate max-w-[180px]">{t.clientName}</span>
              <div className="flex items-center gap-2">
                <span className="text-stone-500">
                  {t.stepsCompleted}/{t.totalSteps}
                </span>
                {t.stepsCompleted === t.totalSteps ? (
                  <Badge variant="success">Done</Badge>
                ) : t.stepsCompleted > 0 ? (
                  <Badge variant="warning">In Progress</Badge>
                ) : (
                  <Badge variant="default">Not Started</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
