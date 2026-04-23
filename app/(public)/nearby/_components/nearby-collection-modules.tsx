import Link from 'next/link'
import type { DirectoryStats } from '@/lib/discover/actions'
import {
  buildNearbyLandingCollectionModel,
  type NearbyLandingCollectionModule,
  type NearbyCollectionViewModel,
} from '@/lib/discover/nearby-collections'

function CollectionChip({ chip }: { chip: string }) {
  return (
    <span className="rounded-full border border-stone-700/70 bg-stone-950/75 px-3 py-1 text-[11px] font-medium text-stone-300">
      {chip}
    </span>
  )
}

function SupportingCollectionLink({ collection }: { collection: NearbyCollectionViewModel }) {
  return (
    <Link
      href={collection.href}
      className="group block rounded-2xl border border-stone-800/80 bg-stone-950/65 p-4 transition-colors hover:border-brand-600/40 hover:bg-stone-950"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
        {collection.eyebrow}
      </p>
      <h3 className="mt-2 text-base font-semibold text-stone-100 transition-colors group-hover:text-white">
        {collection.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-400">{collection.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {collection.filterChips.slice(0, 2).map((chip) => (
          <CollectionChip key={`${collection.slug}-${chip}`} chip={chip} />
        ))}
      </div>
    </Link>
  )
}

function ModuleCollectionLink({ collection }: { collection: NearbyCollectionViewModel }) {
  return (
    <Link
      href={collection.href}
      className="group flex items-start justify-between gap-4 rounded-2xl border border-stone-800/80 bg-stone-950/70 p-4 transition-colors hover:border-brand-600/40 hover:bg-stone-950"
    >
      <div>
        <p className="text-sm font-semibold text-stone-100 transition-colors group-hover:text-white">
          {collection.title}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-400">{collection.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {collection.filterChips.slice(0, 3).map((chip) => (
            <CollectionChip key={`${collection.slug}-${chip}`} chip={chip} />
          ))}
        </div>
      </div>
      <span className="pt-0.5 text-sm font-medium text-brand-200 transition-transform group-hover:translate-x-1">
        Open
      </span>
    </Link>
  )
}

const MODULE_THEME_CLASSES = [
  'border-sky-700/25 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_42%),linear-gradient(180deg,rgba(28,25,23,0.9),rgba(12,10,9,0.95))]',
  'border-emerald-700/25 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_42%),linear-gradient(180deg,rgba(28,25,23,0.9),rgba(12,10,9,0.95))]',
] as const

function CollectionModule({
  module,
  index,
}: {
  module: NearbyLandingCollectionModule
  index: number
}) {
  const themeClass = MODULE_THEME_CLASSES[index % MODULE_THEME_CLASSES.length]

  return (
    <section className={`rounded-[28px] border p-6 sm:p-7 ${themeClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        {module.eyebrow}
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-stone-100">{module.title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-400">{module.description}</p>

      <div className="mt-5 space-y-3">
        {module.collections.map((collection) => (
          <ModuleCollectionLink key={collection.slug} collection={collection} />
        ))}
      </div>
    </section>
  )
}

export function NearbyCollectionModules({ stats }: { stats: DirectoryStats }) {
  const model = buildNearbyLandingCollectionModel({ totalListings: stats.totalListings })

  if (!model.leadCollection) return null

  return (
    <div className="mb-12 space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
        <div className="relative overflow-hidden rounded-[32px] border border-stone-800/80 bg-[radial-gradient(circle_at_top_left,rgba(234,88,12,0.18),transparent_44%),linear-gradient(180deg,rgba(28,25,23,0.98),rgba(12,10,9,0.98))] p-6 sm:p-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(251,146,60,0.12),transparent_70%)]" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
              {model.eyebrow}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-brand-700/35 bg-brand-950/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-100">
                {stats.totalListings.toLocaleString()} live in Nearby
              </span>
              <span className="rounded-full border border-stone-700/70 bg-stone-950/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-300">
                {model.tone === 'established'
                  ? 'Destination-first landing'
                  : 'Coverage-growing landing'}
              </span>
            </div>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-stone-100 sm:text-4xl">
              {model.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-400 sm:text-base">
              {model.description}
            </p>

            <div className="mt-6 rounded-[28px] border border-stone-800/80 bg-stone-950/65 p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-200">
                Spotlight Guide
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-stone-100">
                {model.leadCollection.title}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-400">
                {model.leadCollection.intro}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {model.leadCollection.filterChips.map((chip) => (
                  <CollectionChip key={`${model.leadCollection?.slug}-${chip}`} chip={chip} />
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={model.leadCollection.href}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Open collection guide
                </Link>
                <Link
                  href={model.leadCollection.browseHref}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 px-4 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
                >
                  Open raw browse state
                </Link>
                <Link
                  href="/nearby/collections"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 px-4 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
                >
                  View all collections
                </Link>
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-[32px] border border-stone-800/80 bg-stone-900/55 p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Quick Starts
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-stone-100">
            More intentional entry points.
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-stone-400">
            Visitors can enter through a collection page first, then keep browsing the same Nearby
            feed, filters, and trust cues underneath.
          </p>

          <div className="mt-5 space-y-3">
            {model.supportingCollections.map((collection) => (
              <SupportingCollectionLink key={collection.slug} collection={collection} />
            ))}
          </div>
        </aside>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {model.modules.map((module, index) => (
          <CollectionModule key={module.id} module={module} index={index} />
        ))}
      </div>

      {model.lowDensityNote && (
        <section className="rounded-[28px] border border-brand-700/25 bg-brand-950/15 p-5 sm:flex sm:items-start sm:justify-between sm:gap-6 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
              Low-Data Handling
            </p>
            <h3 className="mt-2 text-xl font-semibold text-stone-100">
              {model.lowDensityNote.title}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-400">
              {model.lowDensityNote.description}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 sm:mt-0 sm:flex-shrink-0">
            <Link
              href="/nearby/collections"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Browse all collections
            </Link>
            <Link
              href="/nearby/submit"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 px-4 text-sm font-medium text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
            >
              Add a business
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
