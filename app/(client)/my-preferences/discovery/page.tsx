import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getUserScrollSignals } from '@/lib/discovery/user-scroll-signals'
import { DiscoveryPreferencesClient } from './discovery-preferences-client'

export const metadata: Metadata = { title: 'Discovery Preferences' }

export default async function DiscoveryPreferencesPage() {
  const user = await requireClient()
  const signals = await getUserScrollSignals(user.id).catch(() => null)
  const preferences = signals?.rankedPreferences ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Discovery Preferences</h1>
          <p className="mt-1 max-w-2xl text-stone-400">
            Review what the homepage discovery rail has learned from your browsing, saves, and
            feedback.
          </p>
        </div>
        <Link
          href="/my-preferences"
          className="text-sm font-medium text-brand-300 underline-offset-4 hover:underline"
        >
          Food preferences
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryStat label="Positive signals" value={countPositive(preferences)} />
        <SummaryStat label="Negative signals" value={countNegative(preferences)} />
        <SummaryStat label="Tracked tastes" value={preferences.length} />
      </div>

      <DiscoveryPreferencesClient preferences={preferences} />
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-stone-100">{value}</p>
    </div>
  )
}

function countPositive(preferences: Array<{ score: number }>): number {
  return preferences.filter((preference) => preference.score > 0).length
}

function countNegative(preferences: Array<{ score: number }>): number {
  return preferences.filter((preference) => preference.score < 0).length
}
