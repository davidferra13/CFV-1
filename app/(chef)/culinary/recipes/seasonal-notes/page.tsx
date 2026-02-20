import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getRecipes } from '@/lib/recipes/actions'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Seasonal Notes - ChefFlow' }

export default async function SeasonalNotesPage() {
  await requireChef()
  const recipes = await getRecipes()

  // Recipes with notes or adaptations — likely to contain seasonal guidance
  const withNotes = recipes.filter(r => (r as any).notes || (r as any).adaptations)
  const withAdaptations = recipes.filter(r => (r as any).adaptations)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/recipes" className="text-sm text-stone-500 hover:text-stone-700">← Recipe Bible</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Seasonal Notes</h1>
          <span className="bg-stone-100 text-stone-600 text-sm px-2 py-0.5 rounded-full">{recipes.length} recipes</span>
        </div>
        <p className="text-stone-500 mt-1">Recipes with seasonal guidance, adaptations, and chef notes</p>
      </div>

      <Card className="p-4 bg-sky-50 border-sky-200">
        <p className="text-sm font-medium text-sky-800">Seasonal notes in ChefFlow</p>
        <p className="text-sm text-sky-700 mt-1">
          Seasonal guidance lives in each recipe&apos;s <strong>Notes</strong> and <strong>Adaptations</strong> fields.
          Edit any recipe to add seasonal variations, peak-season ingredient swaps, or weather-dependent techniques.
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-900">{recipes.length}</p>
          <p className="text-sm text-stone-500 mt-1">Total recipes</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{withNotes.length}</p>
          <p className="text-sm text-stone-500 mt-1">With notes</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-700">{withAdaptations.length}</p>
          <p className="text-sm text-stone-500 mt-1">With adaptations</p>
        </Card>
      </div>

      {withNotes.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium">No recipes with notes yet</p>
          <p className="text-stone-400 text-sm mt-1">
            Open any recipe and add notes or adaptations to capture seasonal guidance
          </p>
          <Link href="/culinary/recipes" className="text-brand-600 hover:underline text-sm mt-3 inline-block">
            Browse recipes →
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {withNotes.map(recipe => (
            <Card key={recipe.id} className="p-4">
              <Link href={`/culinary/recipes/${recipe.id}`} className="font-semibold text-stone-900 hover:text-brand-600">
                {recipe.name}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 capitalize">{recipe.category}</span>
                {(recipe as any).adaptations && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Has adaptations</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
