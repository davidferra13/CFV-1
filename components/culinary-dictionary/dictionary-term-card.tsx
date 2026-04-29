import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { CulinaryDictionaryTerm } from '@/lib/culinary-dictionary/types'
import type { ReactNode } from 'react'

type DictionaryTermCardProps = {
  term: CulinaryDictionaryTerm
  mode: 'chef' | 'public'
  children?: ReactNode
}

function formatTermType(value: string) {
  return value.replace(/_/g, ' ')
}

export function DictionaryTermCard({ term, mode, children }: DictionaryTermCardProps) {
  const visibleAliases = term.aliases.filter((alias) => !alias.needsReview)
  const detailHref =
    mode === 'public'
      ? `/dictionary/${term.canonicalSlug}`
      : `/culinary/dictionary?term=${term.canonicalSlug}`

  return (
    <article className="rounded-xl border border-stone-800 bg-stone-900/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-stone-100">{term.canonicalName}</h2>
            <Badge variant={term.publicSafe ? 'success' : 'warning'}>
              {term.publicSafe ? 'Public' : 'Private'}
            </Badge>
            <Badge variant="info">{formatTermType(term.termType)}</Badge>
          </div>
          {term.category && (
            <p className="mt-1 text-xs uppercase tracking-wide text-stone-500">{term.category}</p>
          )}
          {term.shortDefinition && (
            <p className="mt-3 text-sm leading-6 text-stone-300">{term.shortDefinition}</p>
          )}
          {mode === 'public' && (
            <Link
              href={detailHref}
              className="mt-3 inline-flex text-sm font-medium text-brand-400 hover:text-brand-300"
            >
              View dictionary detail
            </Link>
          )}
        </div>
      </div>

      {visibleAliases.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Also known as
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleAliases.map((alias) => (
              <span
                key={alias.id}
                className="rounded-full border border-stone-700 bg-stone-950 px-2.5 py-1 text-xs text-stone-300"
              >
                {alias.alias}
              </span>
            ))}
          </div>
        </div>
      )}

      {term.safetyFlags.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Safety flags
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {term.safetyFlags.map((flag) => (
              <Badge
                key={flag.id}
                variant={flag.severity === 'critical' ? 'error' : 'warning'}
                title={flag.explanation ?? undefined}
              >
                {flag.flagKey}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {children}
    </article>
  )
}
