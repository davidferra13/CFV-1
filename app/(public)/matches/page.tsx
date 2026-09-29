import type { Metadata } from 'next'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { buildMarketingMetadata } from '@/lib/site/public-site'
import { getConsumerDiscoveryFeed } from '@/lib/public-consumer/discovery-actions'
import {
  buildMarketplaceBookHref,
  buildMarketplaceDiscoveryFilters,
  chefProfileHref,
  marketplaceSummary,
  readMarketplaceSearch,
  selectMarketplaceChefMatches,
} from '@/lib/marketplace/golden-path'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Your Chef Matches',
  description: 'Compare a short list of private chefs matched to your dinner.',
  path: '/matches',
  imagePath: '/social/chefflow-home.png',
  imageAlt: 'ChefFlow chef matches',
})

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}
function formatReviewLine(rating: number | null, reviewCount: number | null) {
  if (!rating || !reviewCount) return null
  return `${rating.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'})`
}

export default async function MatchesPage({ searchParams }: Props) {
  const raw = await searchParams
  const search = readMarketplaceSearch(raw)
  const feed = await getConsumerDiscoveryFeed(buildMarketplaceDiscoveryFilters(search))
  const matches = selectMarketplaceChefMatches(feed.chefs, 3)
  const requestHref = buildMarketplaceBookHref(search)

  return (
    <main className="min-h-screen bg-[#120b08] text-white">
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/find" className="text-sm font-semibold text-orange-400">
              ← Edit request
            </Link>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Your chef matches
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
              {marketplaceSummary(search)}
            </p>
          </div>
          <Link
            href={requestHref}
            className="inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
          >
            Send one request
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-stone-800 bg-stone-900/50 px-4 py-3 text-sm text-stone-400">
          We show at most three chefs who are currently accepting requests. Compare the people,
          food, price guidance, and reviews — then decide.
        </div>

        {matches.length > 0 ? (
          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {matches.map((match) => {
              const profileHref = chefProfileHref(match)
              const reviewLine = formatReviewLine(match.rating, match.reviewCount)
              return (
                <article
                  key={match.id}
                  className="overflow-hidden rounded-3xl border border-stone-800 bg-stone-900"
                >
                  <Link href={profileHref} className="block">
                    <div
                      className="aspect-[4/3] bg-stone-800 bg-cover bg-center"
                      style={
                        match.imageUrl ? { backgroundImage: `url(${match.imageUrl})` } : undefined
                      }
                    >
                      {!match.imageUrl && (
                        <div className="flex h-full items-center justify-center text-6xl font-bold text-stone-600">
                          {match.title.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                          Private chef
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-white">{match.title}</h2>
                      </div>
                      <span className="rounded-full bg-emerald-950 px-2.5 py-1 text-xs font-medium text-emerald-300">
                        Accepting requests
                      </span>
                    </div>
                    {match.subtitle && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-400">
                        {match.subtitle}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-300">
                      {match.locationLabel && <span>{match.locationLabel}</span>}
                      {match.priceLabel && <span>· {match.priceLabel}</span>}
                    </div>

                    {reviewLine && (
                      <p className="mt-3 flex items-center gap-1.5 text-sm text-stone-300">
                        <Star className="h-4 w-4 fill-current text-amber-400" />
                        {reviewLine}
                      </p>
                    )}

                    {match.dietaryTags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {match.dietaryTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-stone-700 px-2.5 py-1 text-xs text-stone-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link
                      href={profileHref}
                      className="mt-5 block rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-stone-950 transition hover:bg-stone-200"
                    >
                      View chef
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-stone-800 bg-stone-900 p-8 text-center">
            <h2 className="text-xl font-bold">No strong chef match yet.</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-400">
              Send the request once. ChefFlow can keep matching qualified chefs without making you
              repeat the details.
            </p>
            <Link
              href={requestHref}
              className="mt-5 inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              Send my request
            </Link>
          </div>
        )}

        <div className="mt-10 rounded-3xl border border-stone-800 bg-stone-950 p-6 text-center sm:p-8">
          <h2 className="text-xl font-bold">Prefer to let chefs come to you?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-400">
            Send one request and let matched chefs respond with menus and pricing. Your search
            details carry forward automatically.
          </p>
          <Link
            href={requestHref}
            className="mt-5 inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
          >
            Request proposals
          </Link>
        </div>
      </section>
    </main>
  )
}
