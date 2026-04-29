import type { Metadata } from 'next'
import { DictionarySearch } from '@/components/culinary-dictionary/dictionary-search'
import { DictionaryTermCard } from '@/components/culinary-dictionary/dictionary-term-card'
import { getDictionaryStats, searchDictionaryTerms } from '@/lib/culinary-dictionary/queries'
import type { DictionaryTermType } from '@/lib/culinary-dictionary/types'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Culinary Dictionary',
  description:
    'Browse ChefFlow culinary terms, ingredient aliases, techniques, and public-safe food vocabulary.',
  alternates: {
    canonical: `${BASE_URL}/dictionary`,
  },
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readParam(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : Array.isArray(value) ? (value[0] ?? '') : ''
}

export default async function PublicDictionaryPage({ searchParams }: Props) {
  const resolved = await searchParams
  const query = readParam(resolved.q)
  const termTypeParam = readParam(resolved.type)
  const termType = (termTypeParam || 'all') as DictionaryTermType | 'all'

  const [terms, stats] = await Promise.all([
    searchDictionaryTerms({ query, termType, publicOnly: true, limit: 60 }),
    getDictionaryStats(),
  ])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-100">Culinary Dictionary</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
          Public-safe culinary terms, ingredient aliases, and technique vocabulary from ChefFlow.
        </p>
        <p className="mt-2 text-xs text-stone-600">
          {stats.publicTerms.toLocaleString()} public terms available.
        </p>
      </div>

      <div className="mb-6">
        <DictionarySearch query={query} termType={termType} actionPath="/dictionary" />
      </div>

      {terms.length === 0 ? (
        <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-8 text-center">
          <p className="font-medium text-stone-200">
            No public dictionary terms match this search.
          </p>
          <p className="mt-2 text-sm text-stone-500">Try a different ingredient or technique.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {terms.map((term) => (
            <DictionaryTermCard key={term.id} term={term} mode="public" />
          ))}
        </div>
      )}
    </div>
  )
}
