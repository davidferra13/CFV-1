import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { getMealPrepProgram, getMealPrepWeeks } from '@/lib/meal-prep/program-actions'
import { WeeklyPlanner } from '@/components/meal-prep/weekly-planner'
import { RotationCalendar } from '@/components/meal-prep/rotation-calendar'
import { ProgramStatusControls } from './status-controls'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, User, Calendar, Truck, Package, LayoutGrid } from '@/components/ui/icons'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'default'> = {
  active: 'success',
  paused: 'warning',
  ended: 'default',
}

type Props = { params: { programId: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = await getMealPrepProgram(params.programId).catch(() => null)
  const clientName = program?.client?.full_name ?? 'Program'
  return { title: `${clientName} Meal Prep - ChefFlow` }
}

export default async function MealPrepProgramPage({ params }: Props) {
  const user = await requireChef()
  await requirePro('operations')

  const program = await getMealPrepProgram(params.programId)
  if (!program) notFound()

  const weeks = await getMealPrepWeeks(params.programId)

  // Fetch available menus for the planner
  const supabase: any = createServerClient()
  const { data: menus } = await supabase
    .from('menus')
    .select('id, title')
    .eq('tenant_id', user.tenantId!)
    .order('title', { ascending: true })

  const availableMenus = (menus ?? []).map((m: any) => ({ id: m.id, title: m.title }))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <Link
        href="/meal-prep"
        className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Meal Prep
      </Link>

      {/* Header card */}
      <div className="bg-stone-900 rounded-xl border border-stone-700/60 shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-stone-100">
                {program.client?.full_name ?? 'Unknown Client'}
              </h1>
              <Badge variant={STATUS_VARIANT[program.status] ?? 'default'}>{program.status}</Badge>
            </div>
            {program.recurring_service && (
              <p className="text-sm text-stone-500 mt-1">
                {program.recurring_service.frequency} service
                {program.recurring_service.rate_cents > 0 &&
                  ` ($${(program.recurring_service.rate_cents / 100).toFixed(2)}/session)`}
              </p>
            )}
          </div>

          <ProgramStatusControls programId={program.id} status={program.status} />
        </div>

        {/* Meta grid */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-500 flex-shrink-0" />
            <div>
              <dt className="sr-only">Delivery Day</dt>
              <dd className="text-stone-200 font-medium">{DAY_NAMES[program.delivery_day]}s</dd>
              <dd className="text-stone-400">
                {program.delivery_window_start} - {program.delivery_window_end}
              </dd>
            </div>
          </div>

          {program.delivery_address && (
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-stone-500 flex-shrink-0" />
              <div>
                <dt className="sr-only">Delivery Address</dt>
                <dd className="text-stone-200">{program.delivery_address}</dd>
                {program.delivery_instructions && (
                  <dd className="text-stone-500 text-xs">{program.delivery_instructions}</dd>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-stone-500 flex-shrink-0" />
            <div>
              <dt className="sr-only">Containers</dt>
              <dd className="text-stone-200 font-medium">
                {program.containers_out} containers out
              </dd>
              <dd className="text-stone-400">{program.containers_returned} returned total</dd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-stone-500 flex-shrink-0" />
            <div>
              <dt className="sr-only">Client</dt>
              <dd>
                <Link
                  href={`/clients/${program.client_id}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Client Profile
                </Link>
              </dd>
            </div>
          </div>
        </dl>
      </div>

      {/* Meal Plan Builder link */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          href={`/meal-prep/${params.programId}/plan?week=${program.current_rotation_week}`}
        >
          <LayoutGrid className="w-4 h-4" />
          Open Meal Plan Builder
        </Button>
      </div>

      {/* Rotation Calendar */}
      <RotationCalendar
        programId={program.id}
        weeks={weeks}
        currentRotationWeek={program.current_rotation_week}
        totalRotationWeeks={program.rotation_weeks}
      />

      {/* Weekly planner (existing) */}
      <WeeklyPlanner program={program} weeks={weeks} menus={availableMenus} />
    </div>
  )
}
