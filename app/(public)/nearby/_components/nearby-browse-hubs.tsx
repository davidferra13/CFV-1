import Link from 'next/link'
import type { DirectoryStats } from '@/lib/discover/actions'
import {
  buildNearbyBrowseHubModel,
  type NearbyBrowseHubLink,
} from '@/lib/discover/nearby-browse-hubs'

function CountBadge({
  count,
  fallbackLabel = 'Growing',
}: {
  count?: number | null
  fallbackLabel?: string
}) {
  return (
    <span className="rounded-full border border-stone-700/80 bg-stone-950/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-300">
      {count != null ? `${count.toLocaleString()} live` : fallbackLabel}
    </span>
  )
}

function HubChip({ chip }: { chip: NearbyBrowseHubLink }) {
  return (
    <Link
      href={chip.href}
      className="rounded-full border border-stone-700/70 bg-stone-950/75 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:border-brand-600/50 hover:text-stone-100"
    >
      {chip.label}
      {chip.count != null && (
        <span className="ml-1.5 text-stone-500">{chip.count.toLocaleString()}</span>
      )}
    </Link>
  )
}

export function NearbyBrowseHubs({ stats }: { stats: DirectoryStats }) {
  const model = buildNearbyBrowseHubModel(stats)
  const leadCity = model.cityHubs[0]?.label ?? 'Coverage growing'
  const leadType = model.typeHubs[0]?.label ?? 'All categories'

  return (
    <div className="mb-12 space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="relative overflow-hidden rounded-[28px] border border-stone-800/80 bg-[radial-gradient(circle_at_top_left,rgba(234,88,12,0.16),transparent_48%),linear-gradient(180deg,rgba(28,25,23,0.98),rgba(12,10,9,0.98))] p-6 sm:p-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(251,146,60,0.12),transparent_70%)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
            Browse Hubs
          </p>
          <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-stone-100 sm:text-3xl">
            Start with the strongest pockets in the directory.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-400 sm:text-base">
            Nearby opens with live listings, city hubs, category hubs, and city-plus-category paths
            that already have coverage. The page stays useful before search instead of waiting for a
            user to build the perfect filter set.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-800/80 bg-stone-950/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Live Directory
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-100">
                {stats.totalListings.toLocaleString()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-stone-400">
                Listings currently browseable without search input.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800/80 bg-stone-950/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Active States
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-100">
                {stats.states.length.toLocaleString()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-stone-400">
                State-level browse paths already live in Nearby.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800/80 bg-stone-950/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Best Starting Point
              </p>
              <p className="mt-2 text-base font-semibold text-stone-100">{leadCity}</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-400">
                Strongest category right now: {leadType}.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-800/80 bg-stone-900/55 p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Fast Lanes
          </p>
          <h3 className="mt-2 text-xl font-semibold text-stone-100">
            Jump into a browse path with one click.
          </h3>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              Categories
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {model.quickTypeLinks.map((chip) => (
                <HubChip key={chip.href} chip={chip} />
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              Cities
            </p>
            {model.quickCityLinks.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {model.quickCityLinks.map((chip) => (
                  <HubChip key={chip.href} chip={chip} />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                City hubs will appear here as soon as the directory forms stronger local clusters.
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Business Types
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-stone-100">
              Browse by category before you search.
            </h3>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-stone-400">
            Each hub keeps the current category model intact, then points to cities where that
            category already looks healthy.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {model.typeHubs.map((hub) => (
            <div
              key={hub.businessType}
              className="rounded-[24px] border border-stone-800/80 bg-stone-900/50 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-100">{hub.label}</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-400">{hub.description}</p>
                </div>
                <CountBadge count={hub.count} />
              </div>

              {hub.supportingLinks.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {hub.supportingLinks.map((link) => (
                    <HubChip key={link.href} chip={link} />
                  ))}
                </div>
              )}

              <Link
                href={hub.href}
                className="mt-5 inline-flex items-center rounded-full border border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-stone-300 transition-colors hover:border-brand-600/50 hover:text-stone-100"
              >
                Open {hub.label.toLowerCase()} hub
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              City Hubs
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-stone-100">
              Start with cities that already have activity.
            </h3>
          </div>

          {model.cityHubs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {model.cityHubs.map((hub) => (
                <div
                  key={hub.href}
                  className="rounded-[24px] border border-stone-800/80 bg-stone-900/50 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-stone-100">{hub.label}</p>
                      <p className="mt-2 text-sm leading-relaxed text-stone-400">
                        {hub.description}
                      </p>
                    </div>
                    <CountBadge count={hub.count} />
                  </div>

                  {hub.supportingLinks.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {hub.supportingLinks.map((link) => (
                        <HubChip key={link.href} chip={link} />
                      ))}
                    </div>
                  )}

                  <Link
                    href={hub.href}
                    className="mt-5 inline-flex items-center rounded-full border border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-stone-300 transition-colors hover:border-brand-600/50 hover:text-stone-100"
                  >
                    Open {hub.city} hub
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-stone-800 bg-stone-900/35 p-5">
              <p className="text-sm leading-relaxed text-stone-400">
                City hubs become visible here once the directory has enough local density to make
                them worth browsing.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-stone-800/80 bg-stone-900/55 p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            City + Type
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-stone-100">
            Open a path that already has some density.
          </h3>

          {model.comboSection.mode === 'live' ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                These combinations only surface when Nearby can back them with live listings, so the
                shortcuts stay grounded in actual coverage.
              </p>
              <div className="mt-5 space-y-3">
                {model.comboSection.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-2xl border border-stone-800/80 bg-stone-950/70 p-4 transition-colors hover:border-brand-600/50 hover:bg-stone-950"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-100">{item.typeLabel}</p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
                          {item.locationLabel}
                        </p>
                      </div>
                      <CountBadge count={item.count} fallbackLabel="Live" />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-stone-400">{item.description}</p>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                {model.comboSection.description}
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-stone-800/80 bg-stone-950/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Start With A City
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {model.comboSection.cityLinks.length > 0 ? (
                      model.comboSection.cityLinks.map((chip) => (
                        <HubChip key={chip.href} chip={chip} />
                      ))
                    ) : (
                      <p className="text-sm leading-relaxed text-stone-400">
                        City clusters will appear here once multiple listings stack up in the same
                        market.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-800/80 bg-stone-950/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Start With A Type
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {model.comboSection.typeLinks.map((chip) => (
                      <HubChip key={chip.href} chip={chip} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
