// Professional Development Page
// Chef logs competitions, stages, press features, awards, courses, etc.
// Also tracks structured learning goals.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { listAchievements, listLearningGoals } from '@/lib/professional/actions'
import {
  isDue,
  getCheckinHistory,
  getLatestSatisfactionScore,
} from '@/lib/professional/growth-checkin-actions'
import { getCurrentMomentum, computeAndStoreMomentum } from '@/lib/professional/momentum-actions'
import { ProfessionalDevelopmentClient } from './professional-development-client'

export const metadata: Metadata = { title: 'Professional Development - ChefFlow' }

export default async function ProfessionalDevelopmentPage() {
  await requireChef()

  const [achievements, goals, checkinDue, checkinHistory, satisfaction, momentum] =
    await Promise.all([
      listAchievements(),
      listLearningGoals(),
      isDue(),
      getCheckinHistory(),
      getLatestSatisfactionScore(),
      getCurrentMomentum(),
    ])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Professional Development</h1>
        <p className="mt-1 text-sm text-stone-500">
          Your career milestones, achievements, and learning goals.
        </p>
      </div>

      <ProfessionalDevelopmentClient
        initialAchievements={achievements}
        initialGoals={goals}
        checkinDue={checkinDue}
        checkinHistory={checkinHistory}
        satisfaction={satisfaction}
        momentum={momentum}
      />
    </div>
  )
}
