// Favorite Chefs - Celebrate the culinary heroes who inspire your craft
// Settings sub-page for managing the chef's list of favorite chefs

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getFavoriteChefs } from '@/lib/favorite-chefs/actions'
import { FavoriteChefEditor } from '@/components/favorite-chefs/favorite-chef-editor'

export const metadata: Metadata = { title: 'Favorite Chefs - ChefFlow' }

export default async function FavoriteChefsPage() {
  await requireChef()

  let chefs: Awaited<ReturnType<typeof getFavoriteChefs>> = []
  try {
    chefs = await getFavoriteChefs()
  } catch {
    chefs = []
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Settings
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Favorite Chefs</h1>
        <p className="text-stone-400 mt-1">
          Celebrate the chefs who inspire you - mentors, idols, and culinary heroes. Share your list
          on social media to show clients what drives your craft.
        </p>
      </div>

      <FavoriteChefEditor chefs={chefs} />
    </div>
  )
}
