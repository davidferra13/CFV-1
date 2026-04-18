import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { listMealPrepPrograms } from '@/lib/meal-prep/program-actions'
import { MealPrepDashboard } from '@/components/meal-prep/meal-prep-dashboard'
import { Button } from '@/components/ui/button'
import { Plus } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Meal Prep' }

export default async function MealPrepPage() {
  await requireChef()
  await requirePro('meal-prep-ops')

  const programs = await listMealPrepPrograms()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Meal Prep</h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage rotating menus, deliveries, and containers for your meal prep clients.
          </p>
        </div>
        <Link href="/clients">
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New Program
          </Button>
        </Link>
      </div>

      <MealPrepDashboard programs={programs} />
    </div>
  )
}
