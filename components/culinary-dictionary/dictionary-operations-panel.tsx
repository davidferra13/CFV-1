import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  buildAliasConflictResolutionOptions,
  buildBatchReviewGroups,
  buildDictionarySurfaceImpactDrilldown,
  buildSafetyCoverageBoard,
  buildTermHistoryTimeline,
  type DictionarySurfaceKind,
} from '@/lib/culinary-dictionary/outcomes'
import type {
  CulinaryDictionaryReviewItem,
  CulinaryDictionaryTerm,
} from '@/lib/culinary-dictionary/types'

type DictionaryOperationsPanelProps = {
  terms: CulinaryDictionaryTerm[]
  reviewItems: CulinaryDictionaryReviewItem[]
  selectedTerm: CulinaryDictionaryTerm | null
}

export function DictionaryOperationsPanel({
  terms,
  reviewItems,
  selectedTerm,
}: DictionaryOperationsPanelProps) {
  const safety = buildSafetyCoverageBoard(terms)
  const batchGroups = buildBatchReviewGroups(reviewItems)
  const conflictOptions = buildAliasConflictResolutionOptions(terms)
  const history = selectedTerm ? buildTermHistoryTimeline(selectedTerm, reviewItems).slice(0, 8) : []
  const drilldown = buildDictionarySurfaceImpactDrilldown(
    reviewItems.map((item) => ({
      id: item.id,
      title: item.sourceValue,
      surface: mapReviewSurface(item.sourceSurface),
      text: item.sourceValue,
      href: `/culinary/dictionary?q=${encodeURIComponent(item.sourceValue)}`,
    })),
    terms,
  ).slice(0, 6)

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-lg font-semibold text-stone-100">Impact Drilldown</h2>
        <p className="mt-1 text-sm text-stone-400">
          Review-source text that already maps back to controlled dictionary terms.
        </p>
        {drilldown.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">No review-source evidence maps to the current terms.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {drilldown.map((surface) => (
              <Link
                key={surface.id}
                href={surface.href ?? '/culinary/dictionary'}
                className="block rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 hover:border-stone-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-stone-200">{surface.title}</p>
                  <Badge variant="info">{surface.matches.length}</Badge>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {surface.matches.map((match) => match.canonicalName).join(', ')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Safety Coverage Board</h2>
            <p className="mt-1 text-sm text-stone-400">
              Allergen, dietary, and cross-contact terms that need public-safe coverage.
            </p>
          </div>
          <Badge variant={safety.criticalTerms > 0 ? 'error' : 'success'}>
            {safety.criticalTerms} critical
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Metric label="Safety terms" value={String(safety.totalSafetyTerms)} />
          <Metric label="Coverage gaps" value={String(safety.missingPublicDefinitions.length)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(safety.flagCounts).map(([type, count]) => (
            <span
              key={type}
              className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-xs text-stone-300"
            >
              {type.replace(/_/g, ' ')}: {count}
            </span>
          ))}
        </div>
        {safety.missingPublicDefinitions.length > 0 && (
          <div className="mt-4 space-y-2">
            {safety.missingPublicDefinitions.slice(0, 4).map((gap) => (
              <Link
                key={`${gap.termId}-${gap.reason}`}
                href={`/culinary/dictionary?term=${gap.canonicalSlug}`}
                className="block rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-300 hover:border-stone-700"
              >
                {gap.canonicalName}
                <span className="ml-2 text-xs text-stone-500">{gap.reason.replace(/_/g, ' ')}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-lg font-semibold text-stone-100">Batch Review Mode</h2>
        <p className="mt-1 text-sm text-stone-400">
          Review queue groups that can be handled together without changing the underlying queue.
        </p>
        {batchGroups.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">No batchable review groups in the current queue.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {batchGroups.map((group) => (
              <div key={group.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-stone-200">{group.label}</p>
                  <Badge variant="info">{group.count}</Badge>
                </div>
                <p className="mt-1 text-xs text-stone-500">{group.nextStep}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-lg font-semibold text-stone-100">Alias Conflict Resolver</h2>
        <p className="mt-1 text-sm text-stone-400">
          Chef-safe resolution paths for labels that point at more than one term.
        </p>
        {conflictOptions.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">No alias conflict options are needed.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {conflictOptions.slice(0, 6).map((option) => (
              <div
                key={`${option.normalizedAlias}-${option.option}`}
                className="rounded-lg border border-stone-800 bg-stone-950 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-stone-200">{option.normalizedAlias}</p>
                  <Badge variant={option.conflictLevel === 'critical' ? 'error' : 'warning'}>
                    {option.option.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-stone-500">{option.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-lg font-semibold text-stone-100">Term History Timeline</h2>
        <p className="mt-1 text-sm text-stone-400">
          Source, aliases, safety flags, and review events for the selected term.
        </p>
        {!selectedTerm ? (
          <p className="mt-4 text-sm text-stone-500">Select a term to inspect its timeline.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {history.map((event) => (
              <Link
                key={event.id}
                href={event.href ?? `/culinary/dictionary?term=${selectedTerm.canonicalSlug}`}
                className="block rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 hover:border-stone-700"
              >
                <p className="text-sm font-medium text-stone-200">{event.label}</p>
                <p className="mt-1 text-xs text-stone-500">{event.detail}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950 p-3">
      <p className="text-lg font-semibold text-stone-100">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{label}</p>
    </div>
  )
}

function mapReviewSurface(sourceSurface: string): DictionarySurfaceKind {
  if (sourceSurface.includes('menu')) return 'menu_copy'
  if (sourceSurface.includes('prep')) return 'staff_prep'
  if (sourceSurface.includes('ingredient')) return 'ingredient_page'
  if (sourceSurface.includes('cost')) return 'costing'
  if (sourceSurface.includes('recipe')) return 'recipe_note'
  if (sourceSurface.includes('search')) return 'dictionary_search'
  return 'public_page'
}
