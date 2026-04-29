import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  buildRelatedTermsGraph,
  detectAliasConflicts,
  getDictionaryTermImpactMap,
  summarizeDictionaryCoverage,
  type TermImpactSurface,
} from '@/lib/culinary-dictionary/term-intelligence'
import { buildChefVocabularyStandards } from '@/lib/culinary-dictionary/vocabulary-standards'
import type {
  CulinaryDictionaryReviewItem,
  CulinaryDictionaryTerm,
} from '@/lib/culinary-dictionary/types'

type DictionaryCommandCenterProps = {
  terms: CulinaryDictionaryTerm[]
  reviewItems: CulinaryDictionaryReviewItem[]
}

const SURFACE_LABELS: Record<TermImpactSurface, string> = {
  public_glossary: 'Public glossary',
  private_dictionary: 'Private dictionary',
  alias_matching: 'Alias matching',
  ingredient_costing: 'Ingredient costing',
  menu_language: 'Menu language',
  dietary_safety: 'Dietary safety',
  allergen_safety: 'Allergen safety',
  staff_training: 'Staff training',
  review_queue: 'Review queue',
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function countSurfaces(terms: CulinaryDictionaryTerm[]): Array<{
  surface: TermImpactSurface
  count: number
}> {
  const impactMap = getDictionaryTermImpactMap(terms)
  const counts = new Map<TermImpactSurface, number>()

  for (const impact of Object.values(impactMap)) {
    for (const surface of impact.surfaces) {
      counts.set(surface, (counts.get(surface) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([surface, count]) => ({ surface, count }))
    .sort((a, b) => b.count - a.count || SURFACE_LABELS[a.surface].localeCompare(SURFACE_LABELS[b.surface]))
}

export function DictionaryCommandCenter({
  terms,
  reviewItems,
}: DictionaryCommandCenterProps) {
  const coverage = summarizeDictionaryCoverage(terms, reviewItems)
  const standards = buildChefVocabularyStandards(terms, reviewItems)
  const conflicts = detectAliasConflicts(terms)
  const graph = buildRelatedTermsGraph(terms)
  const surfaceCounts = countSurfaces(terms)
  const topEdges = graph.edges
    .filter((edge) => edge.score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
  const nodeNameById = new Map(graph.nodes.map((node) => [node.termId, node.canonicalName]))

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Impact Map</h2>
            <p className="mt-1 text-sm text-stone-400">
              Where dictionary terms currently affect ChefFlow.
            </p>
          </div>
          <Badge variant={coverage.unresolvedReviewItems > 0 ? 'warning' : 'success'}>
            {coverage.unresolvedReviewItems} review
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Metric label="Public" value={percent(coverage.publicRatio)} />
          <Metric label="Private" value={percent(coverage.privateRatio)} />
          <Metric label="Safety terms" value={String(coverage.termsWithSafetyFlags)} />
          <Metric label="Alias conflicts" value={String(conflicts.length)} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {surfaceCounts.slice(0, 8).map((item) => (
            <span
              key={item.surface}
              className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-xs text-stone-300"
            >
              {SURFACE_LABELS[item.surface]}: {item.count}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-lg font-semibold text-stone-100">Publication Gate</h2>
        <p className="mt-1 text-sm text-stone-400">
          Public terms stay separated from chef-only standards and unresolved review work.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <Metric label="Public-safe" value={String(standards.publicSafeCandidates.length)} />
          <Metric label="Chef-only" value={String(standards.chefOnlyTerms.length)} />
          <Metric label="Needs review" value={String(standards.needsReviewCandidates.length)} />
        </div>
        {standards.needsReviewCandidates.length > 0 && (
          <div className="mt-4 space-y-2">
            {standards.needsReviewCandidates.slice(0, 4).map((candidate) => (
              <Link
                key={`${candidate.reason}-${candidate.normalizedValue}-${candidate.reviewItemId ?? candidate.termId}`}
                href={`/culinary/dictionary?q=${encodeURIComponent(candidate.value)}`}
                className="block rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-300 hover:border-stone-700"
              >
                {candidate.value}
                <span className="ml-2 text-xs text-stone-500">{candidate.reason}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-lg font-semibold text-stone-100">Alias Conflicts</h2>
        <p className="mt-1 text-sm text-stone-400">
          Ambiguous labels that could split costing, search, or staff vocabulary.
        </p>
        {conflicts.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">No alias conflicts in the current result set.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {conflicts.slice(0, 4).map((conflict) => (
              <div key={conflict.normalizedAlias} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-stone-200">{conflict.normalizedAlias}</p>
                  <Badge variant={conflict.conflictLevel === 'critical' ? 'error' : 'warning'}>
                    {conflict.conflictLevel}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {conflict.aliases.map((alias) => alias.canonicalName).join(', ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-lg font-semibold text-stone-100">Related Terms</h2>
        <p className="mt-1 text-sm text-stone-400">
          Deterministic connections from shared aliases, categories, safety flags, and types.
        </p>
        {topEdges.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">No strong related-term edges in this result set.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {topEdges.map((edge) => (
              <div key={`${edge.fromTermId}-${edge.toTermId}`} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
                <p className="text-sm font-medium text-stone-200">
                  {nodeNameById.get(edge.fromTermId)} + {nodeNameById.get(edge.toTermId)}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {edge.reasons.map((reason) => reason.replace(/_/g, ' ')).join(', ')}
                </p>
              </div>
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
