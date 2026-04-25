import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getCurrentUser } from '@/lib/auth/get-user'
import { checkRateLimit } from '@/lib/rateLimit'
import { discoverPublicCircles } from '@/lib/hub/community-circle-actions'
import { CirclesDiscoveryView } from './circles-discovery-view'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { PUBLIC_DINNER_CIRCLES_ENTRY } from '@/lib/public/public-surface-config'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Community Circles | ChefFlow',
  description:
    'Discover and join food community circles. Talk Japanese cuisine, gluten-free cooking, wine pairings, and more.',
  // Override hub layout noindex: public discovery page should be crawlable
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${BASE_URL}/hub/circles`,
  },
  openGraph: {
    title: 'Community Circles | ChefFlow',
    description:
      'Discover and join food community circles. Talk Japanese cuisine, gluten-free cooking, wine pairings, and more.',
    url: `${BASE_URL}/hub/circles`,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Community Circles | ChefFlow',
    description: 'Discover and join food community circles on ChefFlow.',
  },
}

interface Props {
  searchParams: Promise<{ q?: string; topic?: string }>
}

export default async function CirclesDiscoveryPage({ searchParams }: Props) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  try {
    await checkRateLimit(`hub-circles:${ip}`, 60, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const params = await searchParams
  const [user, result] = await Promise.all([
    getCurrentUser(),
    discoverPublicCircles({
      search: params.q,
      topic: params.topic,
      limit: 20,
    }),
  ])

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <section className="mb-8 rounded-[1.75rem] border border-stone-700/70 bg-stone-900/70 p-6 shadow-[var(--shadow-card)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
            Dinner Circles
          </p>
          <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100">
            Shared guest pages once the dinner is underway.
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base">
            Guests can use Dinner Circles to stay aligned on dinner details, chat, and come back to
            the same page before the event.
          </p>
          <TrackedLink
            href={PUBLIC_DINNER_CIRCLES_ENTRY.href}
            analyticsName="circles_dinner_circles_entry"
            analyticsProps={{ section: 'relocated_home_dinner_circles' }}
            className="mt-6 inline-flex items-center justify-center rounded-2xl border border-stone-700 bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
          >
            Learn about {PUBLIC_DINNER_CIRCLES_ENTRY.label}
          </TrackedLink>
        </section>

        <CirclesDiscoveryView
          initialCircles={result.circles}
          initialCursor={result.nextCursor}
          initialSearch={params.q || ''}
          initialTopic={params.topic || ''}
          isAuthenticated={!!user}
        />
        <PublicSecondaryEntryCluster
          links={PUBLIC_SECONDARY_ENTRY_CONFIG.hub_circles}
          theme="dark"
        />
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
