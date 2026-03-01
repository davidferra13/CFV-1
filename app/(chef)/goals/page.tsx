import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { requireChef } from '@/lib/auth/get-user'
import { getGoalsDashboard } from '@/lib/goals/actions'

const GoalsPageClient = dynamic(
  () => import('@/components/goals/goals-page-client').then((m) => m.GoalsPageClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    ),
  }
)

export const metadata: Metadata = { title: 'Goals - ChefFlow' }

export default async function GoalsPage() {
  await requireChef()

  let dashboard
  try {
    dashboard = await getGoalsDashboard()
  } catch {
    dashboard = null
  }

  if (!dashboard) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-stone-100">Goals</h1>
        <p className="text-stone-400">Could not load goals data. Please try again.</p>
      </div>
    )
  }

  return <GoalsPageClient dashboard={dashboard} />
}
