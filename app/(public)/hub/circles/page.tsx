import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getCurrentUser } from '@/lib/auth/get-user'
import { checkRateLimit } from '@/lib/rateLimit'
import { discoverPublicCircles } from '@/lib/hub/community-circle-actions'
import { CirclesDiscoveryView } from './circles-discovery-view'

export const metadata: Metadata = {
  title: 'Community Circles | ChefFlow',
  description:
    'Discover and join food community circles. Talk Japanese cuisine, gluten-free cooking, wine pairings, and more.',
  // Override hub layout noindex: public discovery page should be crawlable
  robots: { index: true, follow: true },
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
    <div className="min-h-screen bg-stone-950">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <CirclesDiscoveryView
          initialCircles={result.circles}
          initialCursor={result.nextCursor}
          initialSearch={params.q || ''}
          initialTopic={params.topic || ''}
          isAuthenticated={!!user}
        />
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
