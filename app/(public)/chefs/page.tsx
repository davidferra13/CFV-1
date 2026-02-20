// Public Chef Directory
// Server-rendered, SEO-friendly list of all discoverable chefs.
// No authentication required. Links to each chef's public profile.

import type { Metadata } from 'next'
import Link from 'next/link'
import { getDiscoverableChefs } from '@/lib/directory/actions'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Find a Private Chef | ChefFlow',
  description:
    'Browse experienced private chefs available for intimate dinners, special events, and in-home culinary experiences.',
  openGraph: {
    title: 'Find a Private Chef | ChefFlow',
    description:
      'Browse experienced private chefs available for intimate dinners, special events, and in-home culinary experiences.',
    url: `${APP_URL}/chefs`,
    type: 'website',
  },
}

export default async function ChefDirectoryPage() {
  const chefs = await getDiscoverableChefs()

  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-stone-900 sm:text-5xl">
          Find a Private Chef
        </h1>
        <p className="mt-4 text-lg text-stone-600 max-w-xl mx-auto">
          Browse experienced private chefs available for intimate dinners,
          celebrations, and in-home culinary experiences.
        </p>
      </div>

      {chefs.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-4xl mb-4">👨‍🍳</div>
          <p className="text-stone-500 text-lg">
            No chefs listed yet — check back soon.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-stone-400 mb-6 text-center">
            {chefs.length} chef{chefs.length !== 1 ? 's' : ''} available
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {chefs.map((chef) => (
              <Link
                key={chef.id}
                href={`/chef/${chef.slug}`}
                className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_2px_12px_rgb(0,0,0,0.04)] hover:shadow-md hover:border-stone-300 transition-all"
              >
                {/* Avatar + name row */}
                <div className="flex items-center gap-4 mb-3">
                  {chef.profile_image_url ? (
                    <img
                      src={chef.profile_image_url}
                      alt={chef.display_name}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-stone-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center ring-2 ring-stone-100 flex-shrink-0">
                      <span className="text-xl font-bold text-stone-500">
                        {chef.display_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-semibold text-stone-900 group-hover:text-brand-700 truncate">
                      {chef.display_name}
                    </h2>
                    {chef.tagline && (
                      <p className="text-sm text-stone-500 truncate">{chef.tagline}</p>
                    )}
                  </div>
                </div>

                {/* Bio snippet */}
                {chef.bio && (
                  <p className="text-sm text-stone-600 line-clamp-3 leading-relaxed flex-1">
                    {chef.bio}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-brand-600 group-hover:text-brand-700">
                    View profile →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
