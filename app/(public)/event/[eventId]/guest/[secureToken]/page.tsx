import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getGuestEventPortal } from '@/lib/sharing/actions'
import { getChefBrand } from '@/lib/chef/brand'
import { GuestEventPortalClient } from './portal-client'

type Params = { eventId: string; secureToken: string }

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const portal = await getGuestEventPortal(params.eventId, params.secureToken)

  if (portal.state !== 'ready') {
    return {
      title: 'Guest RSVP Portal',
      robots: { index: false, follow: false, nocache: true },
    }
  }

  return {
    title: `${portal.event.title} RSVP`,
    description: 'Private guest RSVP and event intake portal.',
    robots: { index: false, follow: false, nocache: true },
  }
}

export default async function GuestEventPortalPage({ params }: { params: Params }) {
  const portal = await getGuestEventPortal(params.eventId, params.secureToken)

  if (portal.state === 'invalid') {
    notFound()
  }

  // Fetch chef brand for ready portals (logo, colors, powered-by)
  const brand = portal.state === 'ready' ? await getChefBrand(portal.chefId) : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <GuestEventPortalClient
        eventId={params.eventId}
        secureToken={params.secureToken}
        portal={portal}
        brand={brand}
      />
    </div>
  )
}
