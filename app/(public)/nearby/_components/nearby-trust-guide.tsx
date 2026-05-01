import type { DirectoryListingSummary } from '@/lib/discover/actions'
import { getDirectoryListingTrust } from '@/lib/discover/trust'
import { formatDate } from '@/lib/utils/format'

type Props = {
  listings: DirectoryListingSummary[]
}

const TRUST_STATE_ITEMS = [
  {
    key: 'verified',
    label: 'Verified',
    description: 'Owner confirmed the profile. Strongest trust signal on Nearby.',
  },
  {
    key: 'claimed',
    label: 'Claimed',
    description:
      'The business took over the listing, but some fields may still reflect older public data.',
  },
  {
    key: 'discovered',
    label: 'Listed',
    description:
      'Public-source-only listing. Good for browsing, but key details can need confirmation.',
  },
] as const

function trustChipClasses(status: string) {
  if (status === 'verified') {
    return 'border-emerald-500/25 bg-emerald-950/60 text-emerald-200'
  }

  if (status === 'claimed') {
    return 'border-sky-500/25 bg-sky-950/60 text-sky-200'
  }

  return 'border-stone-700/80 bg-stone-950/70 text-stone-200'
}

function parseNearbyDate(value: unknown): Date | null {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function hasFreshnessWarning(listing: DirectoryListingSummary) {
  const trust = getDirectoryListingTrust(listing)
  return [trust.contact, trust.hours, trust.menu].some((field) => field?.tone === 'warning')
}

function buildNearbyTrustSnapshot(listings: DirectoryListingSummary[]) {
  const counts = {
    verified: 0,
    claimed: 0,
    discovered: 0,
  }

  let freshnessWarnings = 0
  let mostRecentUpdate: Date | null = null

  for (const listing of listings) {
    if (listing.status === 'verified') {
      counts.verified += 1
    } else if (listing.status === 'claimed') {
      counts.claimed += 1
    } else {
      counts.discovered += 1
    }

    if (hasFreshnessWarning(listing)) {
      freshnessWarnings += 1
    }

    const updatedAt = parseNearbyDate(listing.updated_at)
    if (updatedAt && (!mostRecentUpdate || updatedAt > mostRecentUpdate)) {
      mostRecentUpdate = updatedAt
    }
  }

  return {
    counts,
    freshnessWarnings,
    ownerBackedCount: counts.verified + counts.claimed,
    mostRecentUpdate,
  }
}

export function NearbyTrustGuide({ listings }: Props) {
  if (listings.length === 0) return null

  const snapshot = buildNearbyTrustSnapshot(listings)

  return (
    <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="rounded-2xl border border-stone-800/80 bg-stone-900/45 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          Trust + Freshness
        </p>
        <h2 className="mt-2 text-xl font-semibold text-stone-100">
          Read the listing state before you click through.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-400">
          Nearby keeps the current category and location browse model, but now makes the confidence
          level explicit: verified is owner-confirmed, claimed is owner-managed with possible
          carryover public fields, and listed is public-source-only. Freshness is tracked
          separately so older public details can be signaled without hiding useful cards.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {TRUST_STATE_ITEMS.map((item) => (
            <div
              key={item.key}
              className="rounded-xl border border-stone-800/70 bg-stone-950/55 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${trustChipClasses(item.key)}`}
                >
                  {item.label}
                </span>
                <span className="text-sm font-semibold text-stone-200">
                  {snapshot.counts[item.key].toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded-2xl border border-stone-800/80 bg-stone-950/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          This Page
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-xl border border-stone-800/70 bg-stone-900/45 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              Visible cards
            </p>
            <p className="mt-1 text-2xl font-semibold text-stone-100">
              {listings.length.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-stone-500">Current page of results.</p>
          </div>
          <div className="rounded-xl border border-stone-800/70 bg-stone-900/45 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              Owner-backed
            </p>
            <p className="mt-1 text-2xl font-semibold text-stone-100">
              {snapshot.ownerBackedCount.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Claimed or verified listings in this page.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-stone-800/70 bg-stone-900/45 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            Freshness note
          </p>
          <p className="mt-1 text-sm font-semibold text-stone-100">
            {snapshot.freshnessWarnings > 0
              ? `${snapshot.freshnessWarnings.toLocaleString()} card${snapshot.freshnessWarnings !== 1 ? 's' : ''} currently flag older public details.`
              : 'No visible cards currently trigger older-detail warnings.'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            {snapshot.mostRecentUpdate
              ? `Most recent listing refresh on this page: ${formatDate(snapshot.mostRecentUpdate)}.`
              : 'Update dates are not available for every listing, so trust chips remain the primary signal.'}
          </p>
        </div>
      </aside>
    </div>
  )
}
