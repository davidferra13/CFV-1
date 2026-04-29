import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  buildRelatedTermsGraph,
  getDictionaryTermImpact,
} from '@/lib/culinary-dictionary/term-intelligence'
import { evaluateVocabularyPublicationGate } from '@/lib/culinary-dictionary/vocabulary-standards'
import type { CulinaryDictionaryTerm } from '@/lib/culinary-dictionary/types'

type DictionarySidePanelProps = {
  selectedTerm: CulinaryDictionaryTerm | null
  terms: CulinaryDictionaryTerm[]
}

export function DictionarySidePanel({ selectedTerm, terms }: DictionarySidePanelProps) {
  if (!selectedTerm) {
    return (
      <aside className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        <h2 className="text-lg font-semibold text-stone-100">Term Standards</h2>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          Select a term from a card to inspect its impact, publication gate, and related vocabulary.
        </p>
      </aside>
    )
  }

  const impact = getDictionaryTermImpact(selectedTerm)
  const gate = evaluateVocabularyPublicationGate(selectedTerm)
  const graph = buildRelatedTermsGraph(terms)
  const relatedIds = new Set<string>()

  for (const edge of graph.edges) {
    if (edge.fromTermId === selectedTerm.id) relatedIds.add(edge.toTermId)
    if (edge.toTermId === selectedTerm.id) relatedIds.add(edge.fromTermId)
  }

  const relatedTerms = terms
    .filter((term) => relatedIds.has(term.id))
    .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
    .slice(0, 6)

  return (
    <aside className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-stone-100">{selectedTerm.canonicalName}</h2>
        <Badge variant={impact.riskLevel === 'high' ? 'error' : impact.riskLevel === 'medium' ? 'warning' : 'success'}>
          {impact.riskLevel} risk
        </Badge>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Used by</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {impact.surfaces.map((surface) => (
            <span key={surface} className="rounded-full border border-stone-700 bg-stone-950 px-2.5 py-1 text-xs text-stone-300">
              {surface.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Publication gate
        </p>
        <p className="mt-2 text-sm text-stone-300">
          {gate.canPublishPublicly
            ? 'This term can appear publicly.'
            : 'This term stays chef-only until its gate is clean.'}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {gate.reasons.map((reason) => (
            <Badge key={reason} variant={reason === 'public_safe' ? 'success' : 'warning'}>
              {reason.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Related terms</p>
        {relatedTerms.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No related terms in the current result set.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {relatedTerms.map((term) => (
              <Link
                key={term.id}
                href={`/culinary/dictionary?term=${term.canonicalSlug}`}
                className="block rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-sm text-stone-300 hover:border-stone-700"
              >
                {term.canonicalName}
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
