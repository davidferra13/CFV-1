// Duplicate Lists
// Renders lists of duplicate pairs for each entity type.

'use client'

import {
  ClientPairCard,
  IngredientPairCard,
  RecipePairCard,
} from '@/components/data-quality/duplicate-pair-card'
import type {
  DuplicateMatch,
  ClientDuplicateItem,
  IngredientDuplicateItem,
  RecipeDuplicateItem,
} from '@/lib/data-quality/duplicates'

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-stone-700/50 bg-stone-800/30 p-8 text-center">
      <p className="text-sm text-stone-400">No duplicate {label} detected.</p>
      <p className="text-xs text-stone-500 mt-1">Your data looks clean.</p>
    </div>
  )
}

export function ClientDuplicateList({
  pairs,
}: {
  pairs: DuplicateMatch<ClientDuplicateItem>[]
}) {
  if (pairs.length === 0) return <EmptyState label="clients" />

  return (
    <div className="space-y-3">
      {pairs.map((pair) => (
        <ClientPairCard
          key={`${pair.item1.id}-${pair.item2.id}`}
          pair={pair}
        />
      ))}
    </div>
  )
}

export function IngredientDuplicateList({
  pairs,
}: {
  pairs: DuplicateMatch<IngredientDuplicateItem>[]
}) {
  if (pairs.length === 0) return <EmptyState label="ingredients" />

  return (
    <div className="space-y-3">
      {pairs.map((pair) => (
        <IngredientPairCard
          key={`${pair.item1.id}-${pair.item2.id}`}
          pair={pair}
        />
      ))}
    </div>
  )
}

export function RecipeDuplicateList({
  pairs,
}: {
  pairs: DuplicateMatch<RecipeDuplicateItem>[]
}) {
  if (pairs.length === 0) return <EmptyState label="recipes" />

  return (
    <div className="space-y-3">
      {pairs.map((pair) => (
        <RecipePairCard
          key={`${pair.item1.id}-${pair.item2.id}`}
          pair={pair}
        />
      ))}
    </div>
  )
}
