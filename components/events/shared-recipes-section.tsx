import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SharedRecipe } from '@/lib/recipes/client-shared-recipes-actions'

interface SharedRecipesSectionProps {
  recipes: SharedRecipe[]
  eventId: string
}

export function SharedRecipesSection({ recipes, eventId }: SharedRecipesSectionProps) {
  if (recipes.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recipes from This Dinner</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500 text-center py-4">
            Your chef hasn&apos;t shared recipes for this dinner yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Recipes from This Dinner</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="rounded-lg border border-stone-700 p-4 hover:border-stone-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-stone-100 truncate">{recipe.name}</h4>
                  {recipe.description && (
                    <p className="text-sm text-stone-400 mt-1 line-clamp-2">{recipe.description}</p>
                  )}
                  {recipe.dietary_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {recipe.dietary_tags.map((tag) => (
                        <Badge key={tag} variant="default" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Badge variant="info" className="shrink-0 text-xs capitalize">
                  {recipe.category.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
