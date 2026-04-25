import Link from 'next/link'
import { ArrowRight, Clock, Users } from 'lucide-react'
import type { ChefMenuSpotlight as ChefMenuSpotlightData } from '@/lib/public-consumer/menu-actions'

function formatCurrency(cents: number | null | undefined) {
  if (!cents || cents <= 0) return null
  return `$${Math.round(cents / 100).toLocaleString()}`
}

function formatGuestRange(minGuests: number | null, maxGuests: number | null) {
  if (minGuests && maxGuests) return `${minGuests}-${maxGuests} guests`
  if (minGuests) return `${minGuests}+ guests`
  if (maxGuests) return `Up to ${maxGuests} guests`
  return null
}

function packageTypeLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function ChefMenuSpotlight({
  spotlight,
  profileSlug,
}: {
  spotlight: ChefMenuSpotlightData
  profileSlug: string
}) {
  const featuredMenu = spotlight.featuredMenu ?? spotlight.showcaseMenus[0] ?? null
  const otherMenus = spotlight.showcaseMenus.filter((menu) => menu.id !== featuredMenu?.id)
  const hasContent =
    Boolean(featuredMenu) ||
    otherMenus.length > 0 ||
    spotlight.packages.length > 0 ||
    spotlight.mealPrepItems.length > 0

  if (!hasContent) return null

  return (
    <section className="border-y border-stone-800/70 bg-stone-900/75 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Menu and package spotlight
            </p>
            <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100">
              Published ways to start the conversation
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-400">
              These are sample menus, packages, or meal prep items the chef has chosen to make
              public. Final menu and pricing still come from the chef before booking.
            </p>
          </div>
          <Link
            href={`/chef/${profileSlug}/inquire`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
          >
            Ask about a menu
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          {featuredMenu && (
            <article className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-300">
                    {featuredMenu.source === 'featured' ? 'Featured menu' : 'Sample menu'}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-stone-100">{featuredMenu.name}</h3>
                  {featuredMenu.description && (
                    <p className="mt-2 text-sm leading-6 text-stone-400">
                      {featuredMenu.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {featuredMenu.guest_range && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs text-stone-300">
                      <Users className="h-3.5 w-3.5" />
                      {featuredMenu.guest_range}
                    </span>
                  )}
                  {featuredMenu.price_label && (
                    <span className="rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs text-stone-300">
                      {featuredMenu.price_label}
                    </span>
                  )}
                </div>
              </div>

              {featuredMenu.dishes.length > 0 && (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {featuredMenu.dishes.slice(0, 6).map((dish) => (
                    <div
                      key={dish.id}
                      className="rounded-xl border border-stone-800 bg-stone-900/70 p-3"
                    >
                      {dish.course_label && (
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                          {dish.course_label}
                        </p>
                      )}
                      <p className="mt-1 text-sm font-medium text-stone-100">{dish.name}</p>
                      {dish.description && (
                        <p className="mt-1 text-xs leading-5 text-stone-400">{dish.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}

          <div className="space-y-4">
            {spotlight.packages.slice(0, 3).map((pkg) => {
              const price = formatCurrency(pkg.base_price_cents)
              const guests = formatGuestRange(pkg.min_guests, pkg.max_guests)
              return (
                <article
                  key={pkg.id}
                  className="rounded-2xl border border-stone-700 bg-stone-950/80 p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-300">
                    {packageTypeLabel(pkg.package_type)}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-stone-100">{pkg.name}</h3>
                  {pkg.description && (
                    <p className="mt-2 text-sm leading-6 text-stone-400">{pkg.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-300">
                    {price && (
                      <span className="rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1">
                        From {price}
                      </span>
                    )}
                    {guests && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1">
                        <Users className="h-3.5 w-3.5" />
                        {guests}
                      </span>
                    )}
                    {pkg.duration_hours && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1">
                        <Clock className="h-3.5 w-3.5" />
                        {pkg.duration_hours} hours
                      </span>
                    )}
                  </div>
                </article>
              )
            })}

            {spotlight.mealPrepItems.slice(0, 4).map((item) => {
              const price = formatCurrency(item.price_cents)
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-stone-700 bg-stone-950/80 p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-300">
                    Meal prep
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-stone-100">{item.name}</h3>
                  {item.description && (
                    <p className="mt-2 text-sm leading-6 text-stone-400">{item.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-300">
                    {price && (
                      <span className="rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1">
                        {price}
                      </span>
                    )}
                    {item.serving_size && (
                      <span className="rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1">
                        {item.serving_size}
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
