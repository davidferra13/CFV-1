import { TrackedLink } from '@/components/analytics/tracked-link'
import { CloudinaryFetchImage } from '@/components/ui/cloudinary-fetch-image'
import { getDiscoveryServiceTypeLabel } from '@/lib/discovery/constants'
import { getChefCoverage, sortDirectoryChefs } from '@/lib/directory/utils'
import type { DirectoryChef } from '@/lib/directory/actions'

type HomepageBookableChefsProps = {
  chefs: DirectoryChef[]
}

function getPrimaryAction(chef: DirectoryChef) {
  if (chef.booking_enabled && chef.booking_slug) {
    return {
      href: `/book/${chef.booking_slug}`,
      label: chef.booking_model === 'instant_book' ? 'Book instantly' : 'Book now',
      analyticsName: 'home_bookable_chef_book',
    }
  }

  if (chef.discovery.accepting_inquiries) {
    return {
      href: `/chef/${chef.slug}/inquire`,
      label: 'Request booking',
      analyticsName: 'home_bookable_chef_inquire',
    }
  }

  return {
    href: `/chef/${chef.slug}`,
    label: 'View profile',
    analyticsName: 'home_bookable_chef_profile',
  }
}

function chefReadinessScore(chef: DirectoryChef) {
  if (chef.booking_enabled && chef.booking_slug && chef.booking_model === 'instant_book') return 3
  if (chef.booking_enabled && chef.booking_slug) return 2
  if (chef.discovery.accepting_inquiries) return 1
  return 0
}

export function HomepageBookableChefs({ chefs }: HomepageBookableChefsProps) {
  const featuredChefs = sortDirectoryChefs(
    chefs.filter((chef) => chefReadinessScore(chef) > 0),
    'featured'
  )
    .sort((a, b) => chefReadinessScore(b) - chefReadinessScore(a))
    .slice(0, 3)

  if (featuredChefs.length === 0) {
    return (
      <section className="relative overflow-hidden border-y border-stone-900/80 bg-stone-950/40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(237,168,107,0.08),transparent_32%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-center lg:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300/80">
              When live profiles are thin
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-[-0.04em] text-stone-100 sm:text-4xl">
              Send the request once.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-400 sm:text-base">
              If the public directory does not show the perfect fit yet, ChefFlow can still capture
              the date, location, guest count, and service style so matched chefs can review it.
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-stone-800 bg-stone-950/75 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
            <p className="text-sm font-semibold text-stone-100">Best next step</p>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              Start an open booking request. It is free to submit, and chefs contact you directly
              when the fit is real.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col">
              <TrackedLink
                href="/book"
                analyticsName="home_bookable_fallback_book"
                analyticsProps={{ section: 'bookable_chefs_fallback' }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl gradient-accent px-4 text-sm font-semibold text-white"
              >
                Start a booking request
              </TrackedLink>
              <TrackedLink
                href="/chefs"
                analyticsName="home_bookable_fallback_directory"
                analyticsProps={{ section: 'bookable_chefs_fallback' }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-stone-700 px-4 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-900 hover:text-stone-100"
              >
                Browse the directory
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden border-y border-stone-900/80 bg-stone-950/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(237,168,107,0.08),transparent_32%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300/80">
              Real chefs, real next steps
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-[-0.04em] text-stone-100 sm:text-4xl">
              Start where money can move.
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-400 sm:text-base">
              These public profiles have booking or inquiry paths available now. Browse the chef,
              then request the fit when the date and scope are ready.
            </p>
          </div>
          <TrackedLink
            href="/chefs?accepting=1"
            analyticsName="home_bookable_chefs_browse_all"
            analyticsProps={{ section: 'bookable_chefs' }}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-stone-700 bg-stone-950 px-5 text-sm font-semibold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
          >
            Browse accepting chefs
          </TrackedLink>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {featuredChefs.map((chef) => {
            const action = getPrimaryAction(chef)
            const services = chef.discovery.service_types
              .slice(0, 2)
              .map(getDiscoveryServiceTypeLabel)
            const coverage = getChefCoverage(chef).slice(0, 2)
            const heroImage = chef.discovery.hero_image_url || chef.profile_image_url

            return (
              <article
                key={chef.id}
                className="group overflow-hidden rounded-[1.35rem] border border-stone-800 bg-stone-950/75 shadow-[0_18px_48px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-700/45"
              >
                <TrackedLink
                  href={`/chef/${chef.slug}`}
                  analyticsName="home_bookable_chef_card"
                  analyticsProps={{ chef_slug: chef.slug }}
                  className="block"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-stone-900">
                    {heroImage ? (
                      <CloudinaryFetchImage
                        src={heroImage}
                        alt={chef.display_name}
                        fill
                        sizes="(min-width: 1024px) 360px, 90vw"
                        aspectRatio={4 / 3}
                        fit="fill"
                        gravity="auto"
                        defaultQuality={90}
                        maxWidth={1200}
                        quality={90}
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-900 to-stone-800">
                        <span className="font-display text-7xl text-brand-300/60">
                          {chef.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      {chef.booking_enabled && chef.booking_slug ? (
                        <span className="rounded-full bg-emerald-950/90 px-3 py-1 text-xs font-semibold text-emerald-200 backdrop-blur">
                          {chef.booking_model === 'instant_book' ? 'Instant book' : 'Bookable'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-brand-950/90 px-3 py-1 text-xs font-semibold text-brand-100 backdrop-blur">
                          Accepting inquiries
                        </span>
                      )}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">
                        {chef.display_name}
                      </h3>
                      {chef.tagline && (
                        <p className="mt-1 truncate text-sm text-white/80">{chef.tagline}</p>
                      )}
                    </div>
                  </div>
                </TrackedLink>

                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <span
                        key={service}
                        className="rounded-full border border-stone-800 bg-stone-900/70 px-2.5 py-1 text-xs text-stone-300"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                  {coverage.length > 0 && (
                    <p className="mt-3 text-sm leading-6 text-stone-400">
                      Serves {coverage.join(', ')}
                    </p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <TrackedLink
                      href={action.href}
                      analyticsName={action.analyticsName}
                      analyticsProps={{ chef_slug: chef.slug, section: 'bookable_chefs' }}
                      className="flex-1 rounded-xl gradient-accent px-4 py-2.5 text-center text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                    >
                      {action.label}
                    </TrackedLink>
                    <TrackedLink
                      href={`/chef/${chef.slug}`}
                      analyticsName="home_bookable_chef_view_profile"
                      analyticsProps={{ chef_slug: chef.slug, section: 'bookable_chefs' }}
                      className="rounded-xl border border-stone-700 px-4 py-2.5 text-center text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-900 hover:text-stone-100"
                    >
                      Profile
                    </TrackedLink>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
