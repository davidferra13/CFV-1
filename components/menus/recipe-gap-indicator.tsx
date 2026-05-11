'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RecipeStatusBadge } from '@/components/recipes/recipe-status-badge'

interface RecipeGapIndicatorProps {
  hasRecipe: boolean
  recipeName?: string
  recipeId?: string
  recipeStatus?: 'stub' | 'draft' | 'active' | 'archived'
  onCreateStub?: () => void
  onLinkRecipe?: () => void
}

export function RecipeGapIndicator({
  hasRecipe,
  recipeName,
  recipeId,
  recipeStatus,
  onCreateStub,
  onLinkRecipe,
}: RecipeGapIndicatorProps) {
  // Linked recipe with a status
  if (hasRecipe && recipeId && recipeName) {
    const isStub = recipeStatus === 'stub'

    return (
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/recipes/${recipeId}`}
          className="text-brand-400 hover:text-brand-300 truncate"
        >
          {recipeName}
        </Link>

        {recipeStatus && <RecipeStatusBadge status={recipeStatus} size="sm" />}

        {isStub && (
          <Link
            href={`/recipes/${recipeId}`}
            className="text-[10px] text-amber-400 hover:text-amber-300"
          >
            Fill in
          </Link>
        )}
      </div>
    )
  }

  // No recipe linked
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-stone-500">No recipe yet</span>
      {onCreateStub && (
        <Button variant="ghost" size="sm" onClick={onCreateStub}>
          Create stub
        </Button>
      )}
      {onLinkRecipe && (
        <Button variant="ghost" size="sm" onClick={onLinkRecipe}>
          Link recipe
        </Button>
      )}
    </div>
  )
}
