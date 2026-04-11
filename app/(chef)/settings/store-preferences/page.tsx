import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAvailableOpenClawStores } from '@/lib/openclaw/store-preference-actions'
import { getPreferredStores } from '@/lib/grocery/store-shopping-actions'
import {
  buildTrackedStoreSuggestions,
  normalizeStoreNameForMatch,
} from '@/lib/openclaw/store-name-utils'
import { StorePreferencesClient } from './store-preferences-client'

export const metadata: Metadata = { title: 'Store Preferences' }

export default async function StorePreferencesPage() {
  await requireChef()

  let storesFetchFailed = false
  const [openclawStores, preferredStores] = await Promise.all([
    getAvailableOpenClawStores().catch(() => {
      storesFetchFailed = true
      return [] as string[]
    }),
    getPreferredStores().catch(() => []),
  ])

  const preferredNames = new Set(
    preferredStores.map((store) => normalizeStoreNameForMatch(store.store_name))
  )
  const suggestions = buildTrackedStoreSuggestions(openclawStores).filter(
    (suggestion) => !preferredNames.has(normalizeStoreNameForMatch(suggestion.label))
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-[28px] border border-stone-800 bg-[radial-gradient(circle_at_top_left,rgba(232,143,71,0.14),transparent_38%),linear-gradient(180deg,rgba(28,25,23,0.96),rgba(12,10,9,0.98))] p-6 shadow-[var(--shadow-card-hover)] sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-brand-200/70 bg-brand-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-800 dark:border-brand-900/70 dark:bg-brand-950/60 dark:text-brand-200">
            Business defaults
          </span>
          <Link
            href="/settings"
            className="text-sm font-medium text-stone-400 transition-colors hover:text-stone-200"
          >
            Back to settings
          </Link>
        </div>
        <div className="mt-4 max-w-3xl space-y-3">
          <h1 className="text-3xl font-bold text-stone-100 sm:text-4xl">Store Preferences</h1>
          <p className="text-sm leading-6 text-stone-300 sm:text-base">
            Pick the stores ChefFlow should prioritize when prices are available. Set one default
            store, add backups or specialty stops, and keep the rest of the app aligned with how you
            actually shop.
          </p>
          <p className="text-sm text-stone-500">
            These preferences affect pricing surfaces, sale views, and grocery planning.
          </p>
        </div>
      </div>

      {storesFetchFailed && (
        <div
          className="rounded-2xl border border-amber-900/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200"
          role="alert"
        >
          Store suggestions could not be loaded. You can still manage your saved preferences below.
        </div>
      )}

      <StorePreferencesClient suggestions={suggestions} initialStores={preferredStores} />
    </div>
  )
}
