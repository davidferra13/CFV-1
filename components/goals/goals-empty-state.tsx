import Link from 'next/link'
import { Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function GoalsEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="rounded-full bg-stone-100 p-4">
          <Target className="h-8 w-8 text-stone-400" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-stone-900">No active goals yet</p>
          <p className="text-sm text-stone-500 max-w-sm">
            Set a revenue target, booking count, or other goal and ChefFlow will track your progress and recommend clients to help you get there.
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
