'use client'

import Link from 'next/link'

interface RecipeLineageProps {
  recipeId: string
  forkedFrom?: { id: string; name: string } | null
  forkCount: number
  versionNumber: number
  versionNote?: string | null
}

export function RecipeLineage({
  recipeId,
  forkedFrom,
  forkCount,
  versionNumber,
  versionNote,
}: RecipeLineageProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
      {forkedFrom && (
        <span>
          Forked from{' '}
          <Link href={`/recipes/${forkedFrom.id}`} className="text-brand-400 hover:text-brand-300">
            {forkedFrom.name}
          </Link>
        </span>
      )}

      <span className="font-medium text-stone-300">v{versionNumber}</span>

      {forkCount > 0 && (
        <Link href={`/recipes/${recipeId}`} className="text-brand-400 hover:text-brand-300">
          {forkCount} {forkCount === 1 ? 'version' : 'versions'}
        </Link>
      )}

      {versionNote && <span className="italic text-stone-500">{versionNote}</span>}
    </div>
  )
}
