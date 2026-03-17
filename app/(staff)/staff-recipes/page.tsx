// Staff Recipes View - Read-only recipe cards for the staff member
// Shows recipes associated with the tenant (chef), with search filtering.

import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/get-user'
import { getMyRecipes, getMyStations, getStationRecipes } from '@/lib/staff/staff-portal-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Recipes' }

type Props = {
  searchParams: { station?: string }
}

export default async function StaffRecipesPage({ searchParams }: Props) {
  const user = await requireStaff()
  const stations = await getMyStations()

  let recipes
  if (searchParams.station) {
    recipes = await getStationRecipes(searchParams.station)
  } else {
    recipes = await getMyRecipes()
  }

  return (
    <div className="space-y-6" data-tour="staff-browse-recipes">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-stone-100">Recipes</h1>

        {/* Station filter */}
        {stations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/staff-recipes"
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                !searchParams.station
                  ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-500'
              }`}
            >
              All Recipes
            </Link>
            {stations.map((station) => (
              <Link
                key={station.id}
                href={`/staff-recipes?station=${station.id}`}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  searchParams.station === station.id
                    ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-500'
                }`}
              >
                {station.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400">No recipes available yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <Card key={recipe.id} className="hover:ring-1 hover:ring-stone-600 transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-stone-100">{recipe.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {recipe.description && (
                  <p className="text-sm text-stone-400 mb-3 line-clamp-2">{recipe.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  {recipe.servings && <Badge variant="default">{recipe.servings} servings</Badge>}
                  {recipe.prep_time_minutes && (
                    <Badge variant="info">{recipe.prep_time_minutes}m prep</Badge>
                  )}
                  {recipe.cook_time_minutes && (
                    <Badge variant="info">{recipe.cook_time_minutes}m cook</Badge>
                  )}
                </div>
                {recipe.instructions && (
                  <div className="text-sm text-stone-300 whitespace-pre-wrap line-clamp-6">
                    {recipe.instructions}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
