import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getMealPrepProgram } from '@/lib/meal-prep/program-actions'
import { getWeeklyMealPlan, getClientDietaryContext } from '@/lib/meal-prep/meal-plan-actions'
import { MealPlanBuilderWrapper } from './builder-wrapper'
import { ChevronLeft } from '@/components/ui/icons'

type Props = {
  params: { programId: string }
  searchParams: { week?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = await getMealPrepProgram(params.programId).catch(() => null)
  const clientName = program?.client?.full_name ?? 'Program'
  return { title: `${clientName} Meal Plan Builder - ChefFlow` }
}

export default async function MealPlanPage({ params, searchParams }: Props) {
  await requireChef()
  await requirePro('operations')

  const program = await getMealPrepProgram(params.programId)
  if (!program) notFound()

  const initialWeek = Math.max(
    1,
    Math.min(
      program.rotation_weeks,
      parseInt(searchParams.week ?? String(program.current_rotation_week)) || 1
    )
  )

  const { plan } = await getWeeklyMealPlan(params.programId, initialWeek)
  const dietary = await getClientDietaryContext(program.client_id)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <Link
        href={`/meal-prep/${params.programId}`}
        className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to {program.client?.full_name ?? 'Program'}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-stone-100">Meal Plan Builder</h1>
        <p className="text-sm text-stone-500 mt-1">
          {program.client?.full_name} - {program.rotation_weeks}-week rotation
        </p>
      </div>

      {/* Builder (client component wrapper handles week switching) */}
      <MealPlanBuilderWrapper
        programId={params.programId}
        initialPlan={plan}
        initialWeek={initialWeek}
        totalRotationWeeks={program.rotation_weeks}
        clientName={program.client?.full_name ?? 'Client'}
        dietary={dietary}
      />
    </div>
  )
}
