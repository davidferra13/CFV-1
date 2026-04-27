import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDirectoryListingBySlug } from '@/lib/discover/actions'
import { getBusinessTypeLabel } from '@/lib/discover/constants'
import { EnhanceProfileForm } from './_components/enhance-profile-form'

type Props = {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getDirectoryListingBySlug(params.slug)
  if (!listing) return { title: 'Listing Not Found' }

  return {
    title: `Complete Your Profile - ${listing.name} | Nearby`,
    robots: { index: false },
  }
}

export default async function EnhanceProfilePage({ params }: Props) {
  const listing = await getDirectoryListingBySlug(params.slug)

  if (!listing) {
    notFound()
  }

  if (listing.status !== 'claimed' && listing.status !== 'verified') {
    return (
      <div className="min-h-screen bg-stone-950">
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-xl font-bold text-stone-100">This listing hasn't been claimed yet</h1>
          <p className="mt-2 text-sm text-stone-400">
            To add details like photos, hours, and a menu link, you need to claim this listing
            first.
          </p>
          <Link
            href={`/nearby/${params.slug}`}
            className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Go to listing
          </Link>
        </div>
      </div>
    )
  }

  const location = [listing.city, listing.state].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="border-b border-stone-800/30">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
          <Link
            href={`/nearby/${params.slug}`}
            className="text-sm text-stone-400 transition-colors hover:text-stone-200"
          >
            &larr; Back to listing
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-stone-100">Complete your profile</h1>
        <p className="mt-2 text-sm text-stone-400">
          Add details to make <strong className="text-stone-200">{listing.name}</strong> stand out.
          Listings with complete profiles get the Verified badge and appear higher in results.
        </p>

        <div className="mt-6 rounded-xl border border-stone-800 bg-stone-900/50 p-4">
          <p className="text-xs font-semibold text-stone-300">Current listing info</p>
          <div className="mt-2 grid gap-2 text-xs text-stone-400">
            <div className="flex justify-between">
              <span>Business</span>
              <span className="text-stone-200">{listing.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Type</span>
              <span className="text-stone-200">{getBusinessTypeLabel(listing.business_type)}</span>
            </div>
            {location && (
              <div className="flex justify-between">
                <span>Location</span>
                <span className="text-stone-200">{location}</span>
              </div>
            )}
            {listing.website_url && (
              <div className="flex justify-between">
                <span>Website</span>
                <span className="text-stone-200 truncate max-w-[200px]">{listing.website_url}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <EnhanceProfileForm
            listingId={listing.id}
            slug={params.slug}
            currentDescription={listing.description || ''}
            currentAddress={listing.address || ''}
            currentPhone={listing.phone || ''}
            currentMenuUrl={listing.menu_url || ''}
          />
        </div>
      </div>
    </div>
  )
}
