import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { NoGoalsIllustration } from '@/components/ui/branded-illustrations'

export function GoalsEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <NoGoalsIllustration className="h-24 w-24" />
        <div className="space-y-1">
          <p className="text-lg font-semibold text-stone-100">No active goals yet</p>
          <p className="text-sm text-stone-500 max-w-sm">
            Set a revenue target, booking count, or other goal and ChefFlow will track your progress
            and recommend clients to help you get there.
          </p>
        </div>
        <Link
          href="/goals/setup"
          className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          Set your first goal
        </Link>
      </CardContent>
    </Card>
  )
}
