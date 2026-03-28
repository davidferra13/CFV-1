'use client'

import { useState, useTransition } from 'react'
import { StoreManager } from '@/components/grocery/store-manager'
import { addPreferredStore, type PreferredStore } from '@/lib/grocery/store-shopping-actions'

export function StorePreferencesClient({
  suggestions,
  initialStores,
}: {
  suggestions: string[]
  initialStores: PreferredStore[]
}) {
  const [isPending, startTransition] = useTransition()
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set())

  function handleQuickAdd(storeName: string) {
    startTransition(async () => {
      try {
        await addPreferredStore({
          store_name: storeName,
          store_type: 'supermarket',
          is_default: false,
        })
        setAddedNames((prev) => new Set([...prev, storeName.toLowerCase()]))
      } catch {
        // StoreManager will show the store list; user can retry
      }
    })
  }

  const visibleSuggestions = suggestions.filter((name) => !addedNames.has(name.toLowerCase()))

  return (
    <div className="space-y-6">
      {visibleSuggestions.length > 0 && (
        <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4">
          <h3 className="text-sm font-medium text-stone-300 mb-3">
            Tracked by OpenClaw (quick add)
          </h3>
          <div className="flex flex-wrap gap-2">
            {visibleSuggestions.map((name) => (
              <button
                key={name}
                onClick={() => handleQuickAdd(name)}
                disabled={isPending}
                className="px-3 py-1.5 text-sm rounded-full border border-stone-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
              >
                + {name}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-500 mt-2">
            These stores have price data from OpenClaw. Adding them personalizes your price
            displays.
          </p>
        </div>
      )}

      <StoreManager initialStores={initialStores} />
    </div>
  )
}
