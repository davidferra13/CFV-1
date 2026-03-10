import { requireChef } from '@/lib/auth/get-user'
import BatchPlanner from '@/components/bakery/batch-planner'

export const metadata = {
  title: 'Batch Planning | Bakery | ChefFlow',
}

export default async function BatchPlanningPage() {
  await requireChef()

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4">
      <BatchPlanner />
    </div>
  )
}
