// Staff Meals Page
// Log and track staff meals with cost analysis.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getStaffMeals } from '@/lib/inventory/staff-meal-actions'
import { StaffMealsClient } from './staff-meals-client'

export const metadata: Metadata = { title: 'Staff Meals - ChefFlow' }

export default async function StaffMealsPage() {
  await requireChef()

  const meals = await getStaffMeals({}).catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Inventory
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Staff Meals</h1>
        <p className="text-stone-500 mt-1">
          Log every staff meal — track ingredient usage, cost per meal, and monthly totals.
        </p>
      </div>

      <StaffMealsClient initialMeals={meals as any[]} />
    </div>
  )
}
