import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { getRecipes } from '@/lib/recipes/actions'
import { RecipeEntryForm } from '@/components/onboarding/recipe-entry-form'

export const metadata = { title: 'Recipe Library | ChefFlow Setup' }

export default async function OnboardingRecipesPage() {
  const recipes = await getRecipes().catch(() => [])

  return (
    <div className="min-h-screen bg-stone-800">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-200 mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Setup
          </Link>
          <h1 className="text-3xl font-bold text-stone-100">Recipe Library</h1>
          <p className="text-stone-400 mt-2 max-w-xl">
            Build your recipe book. Add as many as you want - you can always add more later from the
            Culinary section.
          </p>
        </div>

        <RecipeEntryForm initialRecipes={recipes} />
      </div>
    </div>
  )
}
