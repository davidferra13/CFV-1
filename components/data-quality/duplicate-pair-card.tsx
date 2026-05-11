// Duplicate Pair Card
// Shows two items side by side with similarity score and merge/dismiss actions.

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MergeDialog } from '@/components/data-quality/merge-dialog'
import { dismissDuplicate } from '@/lib/data-quality/merge-actions'
import type { DuplicateMatch } from '@/lib/data-quality/duplicates'

// ─── Similarity badge ───────────────────────────────────────────────────────

function SimilarityBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 90
      ? 'bg-red-950 border-red-800 text-red-300'
      : pct >= 75
        ? 'bg-amber-950 border-amber-800 text-amber-300'
        : 'bg-stone-800 border-stone-600 text-stone-300'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}
    >
      {pct}% match
    </span>
  )
}

// ─── Client Pair Card ───────────────────────────────────────────────────────

export function ClientPairCard({
  pair,
}: {
  pair: DuplicateMatch<{
    id: string
    full_name: string
    email: string | null
    phone: string | null
    status: string
    total_events_count: number
  }>
}) {
  return (
    <DuplicatePairCardShell
      entityType="client"
      pair={pair}
      renderItem={(item) => (
        <div>
          <p className="font-medium text-stone-100 truncate">{item.full_name}</p>
          {item.email && <p className="text-xs text-stone-400 truncate">{item.email}</p>}
          {item.phone && <p className="text-xs text-stone-400">{item.phone}</p>}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center rounded-full bg-stone-800 px-2 py-0.5 text-[10px] font-medium text-stone-300 border border-stone-700">
              {item.status}
            </span>
            <span className="text-[10px] text-stone-500">
              {item.total_events_count} event{item.total_events_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
      keepLabel={(item) => item.full_name}
    />
  )
}

// ─── Ingredient Pair Card ───────────────────────────────────────────────────

export function IngredientPairCard({
  pair,
}: {
  pair: DuplicateMatch<{
    id: string
    name: string
    category: string
    default_unit: string
    recipe_count: number
  }>
}) {
  return (
    <DuplicatePairCardShell
      entityType="ingredient"
      pair={pair}
      renderItem={(item) => (
        <div>
          <p className="font-medium text-stone-100 truncate">{item.name}</p>
          <p className="text-xs text-stone-400 capitalize">{item.category.replace(/_/g, ' ')}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-stone-500">Unit: {item.default_unit}</span>
            <span className="text-[10px] text-stone-500">
              {item.recipe_count} recipe{item.recipe_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
      keepLabel={(item) => item.name}
    />
  )
}

// ─── Recipe Pair Card ───────────────────────────────────────────────────────

export function RecipePairCard({
  pair,
}: {
  pair: DuplicateMatch<{
    id: string
    name: string
    category: string
    times_cooked: number
    ingredient_count: number
  }>
}) {
  return (
    <DuplicatePairCardShell
      entityType="recipe"
      pair={pair}
      renderItem={(item) => (
        <div>
          <p className="font-medium text-stone-100 truncate">{item.name}</p>
          <p className="text-xs text-stone-400 capitalize">{item.category.replace(/_/g, ' ')}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-stone-500">
              Cooked {item.times_cooked} time{item.times_cooked !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px] text-stone-500">
              {item.ingredient_count} ingredient{item.ingredient_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
      keepLabel={(item) => item.name}
    />
  )
}

// ─── Generic Shell ──────────────────────────────────────────────────────────

function DuplicatePairCardShell<T extends { id: string }>({
  entityType,
  pair,
  renderItem,
  keepLabel,
}: {
  entityType: 'client' | 'ingredient' | 'recipe'
  pair: DuplicateMatch<T>
  renderItem: (item: T) => React.ReactNode
  keepLabel: (item: T) => string
}) {
  const router = useRouter()
  const [dismissing, setDismissing] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeKeepId, setMergeKeepId] = useState<string | null>(null)

  const handleDismiss = useCallback(async () => {
    setDismissing(true)
    try {
      const result = await dismissDuplicate(entityType, pair.item1.id, pair.item2.id)
      if (result.success) {
        setDismissed(true)
      }
    } catch (err) {
      console.error('[dismiss-duplicate] Failed:', err)
    } finally {
      setDismissing(false)
    }
  }, [entityType, pair.item1.id, pair.item2.id])

  const handleMergeClick = useCallback(
    (keepId: string) => {
      setMergeKeepId(keepId)
      setMergeOpen(true)
    },
    []
  )

  const handleMergeComplete = useCallback(() => {
    setMergeOpen(false)
    setMergeKeepId(null)
    router.refresh()
  }, [router])

  if (dismissed) {
    return (
      <Card className="opacity-50">
        <CardContent className="py-3 text-center">
          <p className="text-sm text-stone-400">Dismissed</p>
        </CardContent>
      </Card>
    )
  }

  const removeId =
    mergeKeepId === pair.item1.id ? pair.item2.id : pair.item1.id

  return (
    <>
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <SimilarityBadge score={pair.similarity} />
              <span className="text-xs text-stone-500">{pair.matchReason}</span>
            </div>
          </div>

          {/* Side-by-side items */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg border border-stone-700/50 bg-stone-800/30 p-3">
              {renderItem(pair.item1)}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-xs"
                onClick={() => handleMergeClick(pair.item1.id)}
              >
                Keep this one
              </Button>
            </div>
            <div className="rounded-lg border border-stone-700/50 bg-stone-800/30 p-3">
              {renderItem(pair.item2)}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-xs"
                onClick={() => handleMergeClick(pair.item2.id)}
              >
                Keep this one
              </Button>
            </div>
          </div>

          {/* Dismiss action */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              loading={dismissing}
              onClick={handleDismiss}
              className="text-xs text-stone-500"
            >
              Not a duplicate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Merge dialog */}
      {mergeOpen && mergeKeepId && (
        <MergeDialog
          open={mergeOpen}
          entityType={entityType}
          keepId={mergeKeepId}
          removeId={removeId}
          keepLabel={keepLabel(mergeKeepId === pair.item1.id ? pair.item1 : pair.item2)}
          removeLabel={keepLabel(mergeKeepId === pair.item1.id ? pair.item2 : pair.item1)}
          onClose={() => {
            setMergeOpen(false)
            setMergeKeepId(null)
          }}
          onComplete={handleMergeComplete}
        />
      )}
    </>
  )
}
