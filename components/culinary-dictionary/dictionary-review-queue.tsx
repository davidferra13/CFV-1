import { Button } from '@/components/ui/button'
import { resolveDictionaryReviewItemForm } from '@/lib/culinary-dictionary/actions'
import type { CulinaryDictionaryReviewItem } from '@/lib/culinary-dictionary/types'

type DictionaryReviewQueueProps = {
  items: CulinaryDictionaryReviewItem[]
}

export function DictionaryReviewQueue({ items }: DictionaryReviewQueueProps) {
  const pending = items.filter((item) => item.status === 'pending')

  if (pending.length === 0) {
    return (
      <section className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-lg font-semibold text-stone-100">Review Queue</h2>
        <p className="mt-2 text-sm text-stone-400">No dictionary review items are pending.</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Review Queue</h2>
          <p className="mt-1 text-sm text-stone-400">
            Resolve low-confidence aliases before they influence costing or search.
          </p>
        </div>
        <span className="rounded-full bg-amber-950 px-3 py-1 text-xs font-medium text-amber-300">
          {pending.length} pending
        </span>
      </div>

      <div className="mt-4 divide-y divide-stone-800">
        {pending.map((item) => (
          <div key={item.id} className="py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-medium text-stone-100">{item.sourceValue}</p>
                <p className="text-sm text-stone-500">
                  From {item.sourceSurface}
                  {item.suggestedTermName ? `, suggested ${item.suggestedTermName}` : ''}
                  {item.confidence != null ? `, ${Math.round(item.confidence * 100)}%` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['approved', 'rejected', 'dismissed'] as const).map((decision) => (
                  <form key={decision} action={resolveDictionaryReviewItemForm}>
                    <input type="hidden" name="reviewId" value={item.id} />
                    <input type="hidden" name="decision" value={decision} />
                    {item.suggestedTermId && (
                      <input type="hidden" name="termId" value={item.suggestedTermId} />
                    )}
                    <Button
                      type="submit"
                      variant={
                        decision === 'approved'
                          ? 'primary'
                          : decision === 'rejected'
                            ? 'danger'
                            : 'ghost'
                      }
                      size="sm"
                    >
                      {decision === 'approved'
                        ? 'Approve'
                        : decision === 'rejected'
                          ? 'Reject'
                          : 'Dismiss'}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
