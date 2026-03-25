// Recipe Step Photos
// Gallery of all step-by-step photos attached to recipes.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Step Photos | ChefFlow' }

export default async function RecipePhotosPage() {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: photos } = await db
    .from('recipe_step_photos')
    .select('id, photo_url, caption, step_number, recipe:recipes(id, name)')
    .eq('tenant_id', chef.tenantId!)
    .order('created_at', { ascending: false })
    .limit(100)

  const photoList = photos ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Step Photos</h1>
          <p className="mt-1 text-sm text-stone-500">
            All step-by-step photos attached to your recipes. Add photos when editing individual
            recipes.
          </p>
        </div>
        <Link href="/recipes">
          <Button variant="secondary" size="sm">
            All Recipes
          </Button>
        </Link>
      </div>

      {photoList.length === 0 ? (
        <div className="text-center py-20 bg-stone-800 rounded-xl border border-dashed border-stone-600">
          <h3 className="text-lg font-semibold text-stone-200 mb-1">No step photos yet</h3>
          <p className="text-sm text-stone-500 mb-4 max-w-sm mx-auto">
            Open a recipe and add step-by-step photos to document your technique. They will appear
            here.
          </p>
          <Link href="/culinary/recipes">
            <Button variant="primary">Browse Recipes</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photoList.map((photo: any) => (
            <Link
              key={photo.id}
              href={`/recipes/${photo.recipe?.id}`}
              className="group relative aspect-square rounded-lg overflow-hidden bg-stone-800 border border-stone-700"
            >
              {photo.photo_url ? (
                <img
                  src={photo.photo_url}
                  alt={photo.caption ?? `Step ${photo.step_number}`}
                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-600 text-xs">
                  No image
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                <p className="text-xs text-stone-200 truncate">{photo.recipe?.name ?? 'Recipe'}</p>
                {photo.step_number && (
                  <p className="text-xs text-stone-400">Step {photo.step_number}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
