// Client Meal Prep Preferences - Dietary restrictions, allergies, dislikes

import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { getMyProfile } from '@/lib/clients/client-profile-actions'
import { MealPrepPreferencesForm } from './preferences-form'

export const metadata: Metadata = {
  title: 'Meal Prep Preferences - ChefFlow',
}

export default async function MyMealPreferencesPage() {
  await requireClient()

  const profile = (await getMyProfile()) as any

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Meal Preferences</h1>
        <p className="text-stone-400 mt-1">
          Help your chef tailor meals to your taste. Changes take effect on the next prep cycle.
        </p>
      </div>

      <MealPrepPreferencesForm
        initialDietaryRestrictions={profile?.dietary_restrictions || []}
        initialAllergies={profile?.allergies || []}
        initialDislikes={profile?.dislikes || []}
        initialFavoriteCuisines={profile?.favorite_cuisines || []}
        initialSpiceTolerance={profile?.spice_tolerance ?? 5}
        initialNotes={profile?.notes || ''}
      />
    </div>
  )
}
