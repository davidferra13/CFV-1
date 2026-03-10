'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MealPlanBuilder } from '@/components/meal-prep/meal-plan-builder'
import type { DayPlan } from '@/lib/meal-prep/meal-plan-actions'
import { getWeeklyMealPlan } from '@/lib/meal-prep/meal-plan-actions'

interface BuilderWrapperProps {
  programId: string
  initialPlan: DayPlan[]
  initialWeek: number
  totalRotationWeeks: number
  clientName: string
  dietary: {
    allergies: string[]
    dietary_restrictions: string[]
    dislikes: string[]
    favorite_cuisines: string[]
  }
}

export function MealPlanBuilderWrapper({
  programId,
  initialPlan,
  initialWeek,
  totalRotationWeeks,
  clientName,
  dietary,
}: BuilderWrapperProps) {
  const [currentWeek, setCurrentWeek] = useState(initialWeek)
  const [plan, setPlan] = useState<DayPlan[]>(initialPlan)
  const [, startTransition] = useTransition()
  const router = useRouter()

  function handleWeekChange(week: number) {
    setCurrentWeek(week)

    // Fetch new week's plan
    startTransition(async () => {
      try {
        const { plan: newPlan } = await getWeeklyMealPlan(programId, week)
        setPlan(newPlan)
        // Update URL without full reload
        router.replace(`/meal-prep/${programId}/plan?week=${week}`, { scroll: false })
      } catch {
        // Keep previous plan on error
      }
    })
  }

  return (
    <MealPlanBuilder
      programId={programId}
      initialPlan={plan}
      rotationWeek={currentWeek}
      totalRotationWeeks={totalRotationWeeks}
      clientName={clientName}
      dietary={dietary}
      onWeekChange={handleWeekChange}
    />
  )
}
