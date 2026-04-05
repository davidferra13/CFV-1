import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getAvailableOpenClawStores } from '@/lib/openclaw/store-preference-actions'
import { getPreferredStores } from '@/lib/grocery/store-shopping-actions'
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

  // Filter out stores the chef already has
  const preferredNames = new Set(preferredStores.map((s) => s.store_name.toLowerCase()))
  const suggestions = openclawStores.filter((name) => !preferredNames.has(name.toLowerCase()))

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Store Preferences</h1>
        <p className="text-stone-400 mt-1">
          Select your preferred stores for personalized pricing throughout ChefFlow. Your default
          store&apos;s prices will be shown first when available.
        </p>
      </div>

      {storesFetchFailed && (
        <div
          className="mb-4 rounded-lg border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-200"
          role="alert"
        >
          Store suggestions could not be loaded. You can still manage your saved preferences below.
        </div>
      )}

      <StorePreferencesClient suggestions={suggestions} initialStores={preferredStores} />
    </div>
  )
}
