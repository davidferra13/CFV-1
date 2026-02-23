// Public Chef Directory — Premium Listing
// Server-rendered, SEO-friendly. Only admin-approved chefs appear.
// Founder (davidferra13@gmail.com) is always listed.

import type { Metadata } from 'next'
import Link from 'next/link'
import { getDiscoverableChefs } from '@/lib/directory/actions'
import { ChefHero } from './_components/chef-hero'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Hire a Private Chef | ChefFlow',
  description:
    'Book an unforgettable private dining experience. Browse curated private chefs and start your inquiry in seconds.',
  openGraph: {
    title: 'Hire a Private Chef | ChefFlow',
    description:
      'Book an unforgettable private dining experience. Browse curated private chefs and start your inquiry in seconds.',
    url: `${APP_URL}/chefs`,
    type: 'website',
  },
}

export default async function ChefDirectoryPage() {
  const chefs = await getDiscoverableChefs()

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Hero */}
      <ChefHero />

      {/* Chef Grid */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        {chefs.length === 0 ? (
          <div className="text-center py-24">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
              <span className="text-4xl">&#x1F468;&#x200D;&#x1F373;</span>
            </div>
            <h2 className="text-xl font-semibold text-stone-700">Our chef roster is coming soon</h2>
            <p className="mt-2 text-stone-500 max-w-md mx-auto">
              We&apos;re hand-selecting the best private chefs in the area. Check back soon or{' '}
              <Link
                href="/contact"
                className="font-medium text-brand-600 hover:text-brand-700 underline"
              >
                get in touch
              </Link>{' '}
              to be the first to know.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <p className="text-sm font-medium uppercase tracking-widest text-brand-600">
                {chefs.length} curated chef{chefs.length !== 1 ? 's' : ''} available
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {chefs.map((chef) => (
                <article
                  key={chef.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_20px_rgb(0,0,0,0.06)] ring-1 ring-stone-100 transition-all duration-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.10)] hover:ring-brand-200 hover:-translate-y-1"
                >
                  {/* Photo area */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50">
                    {chef.profile_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={chef.profile_image_url}
                        alt={chef.display_name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-7xl font-display text-brand-300">
                          {chef.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Gradient overlay at bottom for text readability */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />

                    {/* Name overlay on image */}
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h2 className="text-xl font-bold text-white drop-shadow-sm">
                        {chef.display_name}
                      </h2>
                      {chef.tagline && (
                        <p className="mt-0.5 text-sm text-white/85 truncate drop-shadow-sm">
                          {chef.tagline}
                        </p>
                      )}
                    </div>

                    {/* Founder badge */}
                    {chef.is_founder && (
                      <div className="absolute top-4 right-4 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
                        Featured
                      </div>
                    )}
                  </div>

                  {/* Content area */}
                  <div className="flex flex-1 flex-col p-5">
                    {chef.bio && (
                      <p className="text-sm leading-relaxed text-stone-600 line-clamp-3 flex-1">
                        {chef.bio}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="mt-5 flex gap-3">
                      <Link
                        href={`/chef/${chef.slug}/inquire`}
                        className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-[0.98]"
                      >
                        Book Now
                      </Link>
                      <Link
                        href={`/chef/${chef.slug}`}
                        className="rounded-xl border border-stone-200 px-4 py-3 text-center text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900 hover:border-stone-300"
                      >
                        Profile
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* Trust footer */}
        <div className="mt-16 text-center">
          <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-stone-800">
              Every chef on ChefFlow is personally vetted
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
              We work with experienced private chefs who have been hand-selected for their craft,
              professionalism, and commitment to creating unforgettable dining experiences.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
