import { Button } from '@/components/ui/button'
import { resolveDictionaryReviewItemForm } from '@/lib/culinary-dictionary/actions'
import {
  DICTIONARY_ALIAS_KINDS,
  DICTIONARY_TERM_TYPES,
  type CulinaryDictionaryReviewItem,
} from '@/lib/culinary-dictionary/types'

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
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
              <div>
                <p className="font-medium text-stone-100">{item.sourceValue}</p>
                <p className="text-sm text-stone-500">
                  From {item.sourceSurface}
                  {item.suggestedTermName ? `, suggested ${item.suggestedTermName}` : ''}
                  {item.confidence != null ? `, ${Math.round(item.confidence * 100)}%` : ''}
                </p>
                <dl className="mt-3 grid gap-2 text-xs text-stone-400 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-stone-500">Normalized</dt>
                    <dd className="mt-1 rounded-md border border-stone-800 bg-stone-950 px-2 py-1 text-stone-300">
                      {item.normalizedValue}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-stone-500">Suggested term</dt>
                    <dd className="mt-1 rounded-md border border-stone-800 bg-stone-950 px-2 py-1 text-stone-300">
                      {item.suggestedTermName ?? 'None'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="grid gap-3">
                <form
                  action={resolveDictionaryReviewItemForm}
                  className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"
                >
                  <input type="hidden" name="reviewId" value={item.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <input type="hidden" name="resolutionAction" value="approve_new_private_term" />
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                    <label className="text-xs font-medium text-stone-400">
                      Private term
                      <input
                        name="canonicalName"
                        defaultValue={item.sourceValue}
                        maxLength={100}
                        className="mt-1 w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                      />
                    </label>
                    <label className="text-xs font-medium text-stone-400">
                      Type
                      <select
                        name="termType"
                        defaultValue="ingredient"
                        className="mt-1 w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                      >
                        {DICTIONARY_TERM_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="mt-3 block text-xs font-medium text-stone-400">
                    Definition note
                    <input
                      name="definition"
                      maxLength={500}
                      placeholder="Optional"
                      className="mt-1 w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600"
                    />
                  </label>
                  <Button type="submit" variant="primary" size="sm" className="mt-3 w-full">
                    Approve new private term
                  </Button>
                </form>

                {item.suggestedTermId && (
                  <form
                    action={resolveDictionaryReviewItemForm}
                    className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"
                  >
                    <input type="hidden" name="reviewId" value={item.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <input
                      type="hidden"
                      name="resolutionAction"
                      value="add_alias_to_existing_term"
                    />
                    <input type="hidden" name="termId" value={item.suggestedTermId} />
                    <label className="text-xs font-medium text-stone-400">
                      Alias for {item.suggestedTermName ?? 'suggested term'}
                      <input
                        name="alias"
                        defaultValue={item.sourceValue}
                        maxLength={80}
                        className="mt-1 w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                      />
                    </label>
                    <label className="mt-3 block text-xs font-medium text-stone-400">
                      Alias kind
                      <select
                        name="aliasKind"
                        defaultValue="synonym"
                        className="mt-1 w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                      >
                        {DICTIONARY_ALIAS_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {kind.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button type="submit" variant="secondary" size="sm" className="mt-3 w-full">
                      Add as alias
                    </Button>
                  </form>
                )}

                <div className="flex flex-wrap gap-2">
                  {(['rejected', 'dismissed'] as const).map((decision) => (
                    <form key={decision} action={resolveDictionaryReviewItemForm}>
                      <input type="hidden" name="reviewId" value={item.id} />
                      <input type="hidden" name="decision" value={decision} />
                      <input
                        type="hidden"
                        name="resolutionAction"
                        value={decision === 'rejected' ? 'reject' : 'dismiss'}
                      />
                      <Button
                        type="submit"
                        variant={decision === 'rejected' ? 'danger' : 'ghost'}
                        size="sm"
                      >
                        {decision === 'rejected' ? 'Reject' : 'Dismiss'}
                      </Button>
                    </form>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
