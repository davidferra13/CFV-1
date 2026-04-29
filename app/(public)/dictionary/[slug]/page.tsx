import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { getDictionaryTermBySlug } from '@/lib/culinary-dictionary/queries'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type Props = {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const term = await getDictionaryTermBySlug(params.slug, true)
  if (!term) return { title: 'Dictionary term not found', robots: { index: false, follow: false } }

  return {
    title: `${term.canonicalName} - Culinary Dictionary`,
    description:
      term.shortDefinition ?? `${term.canonicalName} in the ChefFlow culinary dictionary.`,
    alternates: {
      canonical: `${BASE_URL}/dictionary/${term.canonicalSlug}`,
    },
  }
}

export default async function PublicDictionaryTermPage({ params }: Props) {
  const term = await getDictionaryTermBySlug(params.slug, true)
  if (!term || !term.publicSafe) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/dictionary"
        className="mb-6 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dictionary
      </Link>

      <article className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold text-stone-100">{term.canonicalName}</h1>
          <Badge variant="info">{term.termType}</Badge>
          {term.category && <Badge variant="default">{term.category}</Badge>}
        </div>

        {term.shortDefinition && (
          <p className="mt-5 text-lg leading-7 text-stone-200">{term.shortDefinition}</p>
        )}

        {term.longDefinition && (
          <p className="mt-4 text-sm leading-6 text-stone-400">{term.longDefinition}</p>
        )}

        {term.aliases.length > 0 && (
          <section className="mt-6 border-t border-stone-800 pt-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Also known as
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {term.aliases.map((alias) => (
                <span
                  key={alias.id}
                  className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-sm text-stone-300"
                >
                  {alias.alias}
                </span>
              ))}
            </div>
          </section>
        )}

        {term.safetyFlags.length > 0 && (
          <section className="mt-6 border-t border-stone-800 pt-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Safety flags
            </h2>
            <div className="mt-3 space-y-2">
              {term.safetyFlags.map((flag) => (
                <div key={flag.id} className="rounded-lg bg-stone-950 p-3">
                  <p className="text-sm font-medium text-stone-200">{flag.flagKey}</p>
                  {flag.explanation && (
                    <p className="mt-1 text-sm text-stone-500">{flag.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  )
}
