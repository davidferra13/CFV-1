// Plating Guides Library Page
// Grid of all plating guide cards with search and filtering

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getPlatingGuides } from '@/lib/recipes/plating-actions'
import { PlatingGuidesLibrary } from './plating-guides-library'

export const metadata: Metadata = { title: 'Plating Guides - ChefFlow' }

export default async function PlatingGuidesPage() {
  await requireChef()
  const guides = await getPlatingGuides()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Plating Guides</h1>
        <p className="text-stone-500 mt-1">
          Visual presentation instructions for your dishes. Share with staff for consistent plating.
        </p>
      </div>

      <PlatingGuidesLibrary initialGuides={guides} />
    </div>
  )
}
