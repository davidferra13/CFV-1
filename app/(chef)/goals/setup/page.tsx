import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { GoalWizardSteps } from '@/components/goals/goal-wizard-steps'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'New Goal' }

export default async function GoalSetupPage() {
  await requireChef()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/goals"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Goals
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">New Goal</h1>
        <p className="text-stone-400 mt-1">
          Set a target and ChefFlow will track your progress, show you how to close any gap, and
          suggest which clients to reach out to.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <GoalWizardSteps />
        </CardContent>
      </Card>
    </div>
  )
}
