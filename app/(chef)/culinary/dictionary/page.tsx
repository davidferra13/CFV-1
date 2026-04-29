import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { Card, CardContent } from '@/components/ui/card'
import { ChefDictionaryTermCard } from '@/components/culinary-dictionary/chef-dictionary-term-card'
import { DictionaryReviewQueue } from '@/components/culinary-dictionary/dictionary-review-queue'
import { DictionarySearch } from '@/components/culinary-dictionary/dictionary-search'
import {
  getDictionaryReviewQueue,
  getDictionaryStats,
  searchDictionaryTerms,
} from '@/lib/culinary-dictionary/queries'
import type { DictionaryTermType } from '@/lib/culinary-dictionary/types'

export const metadata: Metadata = {
  title: 'Culinary Dictionary',
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readParam(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : Array.isArray(value) ? (value[0] ?? '') : ''
}

export default async function CulinaryDictionaryPage({ searchParams }: Props) {
  const user = await requireChef()
  const resolved = await searchParams
  const query = readParam(resolved.q)
  const termTypeParam = readParam(resolved.type)
  const termType = (termTypeParam || 'all') as DictionaryTermType | 'all'

  const [terms, stats, reviewItems] = await Promise.all([
    searchDictionaryTerms({ query, termType, chefId: user.entityId, limit: 60 }),
    getDictionaryStats(user.entityId),
    getDictionaryReviewQueue(user.entityId),
  ])

  const statCards = [
    { label: 'Terms', value: stats.totalTerms },
    { label: 'Public', value: stats.publicTerms },
    { label: 'Aliases', value: stats.aliasCount },
    { label: 'Reviews', value: stats.pendingReviews },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Culinary Dictionary</h1>
        <p className="mt-1 max-w-3xl text-sm text-stone-400">
          Canonical terms, aliases, safety flags, and chef-specific vocabulary used by costing,
          search, recipes, menus, and public ingredient pages.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-4">
              <p className="text-2xl font-bold text-stone-100">{stat.value.toLocaleString()}</p>
              <p className="mt-1 text-sm text-stone-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DictionarySearch query={query} termType={termType} actionPath="/culinary/dictionary" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-3">
          {terms.length === 0 ? (
            <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-8 text-center">
              <p className="font-medium text-stone-200">No dictionary terms match this search.</p>
              <p className="mt-2 text-sm text-stone-500">
                Reset filters or add a chef-specific term through the review workflow.
              </p>
            </div>
          ) : (
            terms.map((term) => <ChefDictionaryTermCard key={term.id} term={term} />)
          )}
        </section>

        <DictionaryReviewQueue items={reviewItems} />
      </div>
    </div>
  )
}
