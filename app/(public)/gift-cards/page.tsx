// Public Gift Cards Browse Page
// Global entry point for consumers who want to buy a gift card
// without already knowing a specific chef.

import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getDiscoverableChefs } from '@/lib/directory/actions'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Gift Cards - Give the Gift of a Private Chef | ChefFlow',
  description:
    'Buy a gift card for a private chef experience. Browse chefs and give someone a meal they will never forget.',
  openGraph: {
    title: 'Gift Cards - Give the Gift of a Private Chef',
    description: 'Browse chefs and give someone a meal they will never forget.',
    url: `${APP_URL}/gift-cards`,
    type: 'website',
  },
}

export const revalidate = 120

export default async function GiftCardsPage() {
  const allChefs = await getDiscoverableChefs()

  // Only show chefs with profiles complete enough to gift
  const giftableChefs = allChefs.filter(
    (c: any) => c.slug && (c.bio || c.tagline) && c.display_name && !c.display_name.includes('@')
  )

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Hero */}
      <section className="bg-gradient-to-b from-stone-900 to-stone-950 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-100 mb-4">
            Give the gift of a private chef
          </h1>
          <p className="text-lg text-stone-400 max-w-xl mx-auto">
            Pick a chef, choose an amount, and send a gift card to someone who deserves a meal they
            will never forget.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-10 px-4 border-b border-stone-800">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl mb-2">1</div>
              <p className="text-sm font-semibold text-stone-200">Choose a chef</p>
              <p className="text-xs text-stone-500 mt-1">Browse profiles below</p>
            </div>
            <div>
              <div className="text-2xl mb-2">2</div>
              <p className="text-sm font-semibold text-stone-200">Pick an amount</p>
              <p className="text-xs text-stone-500 mt-1">$5 to $2,000</p>
            </div>
            <div>
              <div className="text-2xl mb-2">3</div>
              <p className="text-sm font-semibold text-stone-200">Send it</p>
              <p className="text-xs text-stone-500 mt-1">Recipient gets the code by email</p>
            </div>
          </div>
        </div>
      </section>

      {/* Chef grid */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-stone-100 mb-6">
            {giftableChefs.length > 0
              ? `${giftableChefs.length} chef${giftableChefs.length !== 1 ? 's' : ''} accepting gift cards`
              : 'Chefs coming soon'}
          </h2>

          {giftableChefs.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {giftableChefs.map((chef: any) => (
                <Link
                  key={chef.id}
                  href={`/chef/${chef.slug}/gift-cards`}
                  className="group rounded-xl border border-stone-800 bg-stone-900/50 p-5 transition-all hover:border-stone-600 hover:bg-stone-900"
                >
                  <div className="flex items-center gap-4 mb-3">
                    {chef.profile_image_url ? (
                      <Image
                        src={chef.profile_image_url}
                        alt={chef.display_name}
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-stone-700 flex items-center justify-center">
                        <span className="text-lg font-bold text-stone-400">
                          {chef.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-100 truncate">
                        {chef.display_name}
                      </p>
                      {chef.tagline && (
                        <p className="text-xs text-stone-400 truncate">{chef.tagline}</p>
                      )}
                    </div>
                  </div>

                  {chef.discovery?.cuisine_types?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {chef.discovery.cuisine_types.slice(0, 3).map((c: string) => (
                        <span
                          key={c}
                          className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-400"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-brand-400 font-medium group-hover:text-brand-300 transition-colors">
                    Buy Gift Card &rarr;
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-stone-400 mb-4">
                No chefs with gift cards available yet. Check back soon, or book a chef directly.
              </p>
              <Link
                href="/chefs"
                className="inline-flex items-center gap-2 rounded-lg bg-stone-100 px-5 py-2.5 text-sm font-semibold text-stone-900 hover:bg-white transition-colors"
              >
                Browse Chefs
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Secondary entries */}
      <section className="py-8 px-4 border-t border-stone-800">
        <div className="max-w-3xl mx-auto">
          <PublicSecondaryEntryCluster links={PUBLIC_SECONDARY_ENTRY_CONFIG.gift_cards} />
        </div>
      </section>
    </div>
  )
}
