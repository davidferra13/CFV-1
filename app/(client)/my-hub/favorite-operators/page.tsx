import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getMyFavoriteDirectoryListings } from '@/lib/discover/actions'
import { ListingCard } from '@/app/(public)/nearby/_components/listing-card'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { ArrowLeft, Heart } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Favorite Operators' }

export default async function FavoriteOperatorsPage() {
  await requireClient()
  const favorites = await getMyFavoriteDirectoryListings()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/my-hub"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Hub
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-700/30 bg-rose-950/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">
            <Heart className="h-3.5 w-3.5" weight="fill" />
            Saved Nearby
          </div>
          <h1 className="mt-4 text-3xl font-bold text-stone-100">Favorite Operators</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-400">
            Keep a shortlist of restaurants, caterers, bakeries, food trucks, and other Nearby
            operators you want to revisit or share later.
          </p>
        </div>
        <Link href="/nearby">
          <Button variant="secondary">Browse Nearby</Button>
        </Link>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/30 px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-950/30">
            <Heart className="h-7 w-7 text-rose-300" />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-stone-100">No favorite operators yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-400">
            Save operators from Nearby to keep a working shortlist for dinner ideas, group plans,
            and follow-up later.
          </p>
          <Link href="/nearby" className="mt-6 inline-flex">
            <Button variant="primary">Browse Nearby</Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-stone-500">
            {favorites.length.toLocaleString()} saved operator{favorites.length === 1 ? '' : 's'}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((listing) => (
              <ListingCard key={listing.id} listing={listing} favoriteMode="active" />
            ))}
          </div>
        </>
      )}

      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}

export const dynamic = 'force-dynamic'
