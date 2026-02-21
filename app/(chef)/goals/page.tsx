import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getGoalsDashboard } from '@/lib/goals/actions'
import { GoalsPageClient } from '@/components/goals/goals-page-client'

export const metadata: Metadata = { title: 'Goals - ChefFlow' }

export default async function GoalsPage() {
  await requireChef()
  const dashboard = await getGoalsDashboard()

  return <GoalsPageClient dashboard={dashboard} />
}
