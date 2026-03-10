// Food Truck - Commissary Load-Out Workflow
// Generate and track a checklist of everything to load from the commissary.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getLoadOutForDate } from '@/lib/food-truck/commissary-actions'
import { CommissaryLoadout } from '@/components/food-truck/commissary-loadout'

export const metadata: Metadata = { title: 'Load-Out - ChefFlow' }

export default async function LoadOutPage() {
  await requireChef()

  const today = new Date().toISOString().split('T')[0]
  const checklist = await getLoadOutForDate(today)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Commissary Load-Out</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Everything you need to load from the commissary before heading out. Generate a checklist
          based on your schedule and check items off as you go.
        </p>
      </div>

      <CommissaryLoadout initialChecklist={checklist} initialDate={today} />
    </div>
  )
}
