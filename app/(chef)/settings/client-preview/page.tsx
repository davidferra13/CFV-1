// Client Preview Page - lets chefs see exactly what their clients experience.
// Two tabs: Public Profile (inline render) and Client Portal (live data, read-only).
// NOTE: We render the public profile inline (not via iframe) because next.config.js
// sets X-Frame-Options: DENY globally, which blocks iframes of our own pages.

import type { Metadata } from 'next'
import { getChefSlug, getPublicChefProfile } from '@/lib/profile/actions'
import { getPreviewClients } from '@/lib/preview/client-portal-preview-actions'
import { getPublicChefReviewFeed } from '@/lib/reviews/public-actions'
import { getPublicAvailabilitySignals } from '@/lib/calendar/entry-actions'
import { ClientPreviewTabs } from './client-preview-tabs'

export const metadata: Metadata = { title: 'Client Preview' }

export default async function ClientPreviewPage() {
  // requireChef() is invoked internally by both getChefSlug() and getPreviewClients()
  const [profile, clients] = await Promise.all([getChefSlug(), getPreviewClients()])

  // Fetch the full public profile data (same as what /chef/[slug] renders)
  const publicProfileData = profile?.slug ? await getPublicChefProfile(profile.slug) : null

  // Fetch review and availability data so the preview matches the live public page
  const [reviewFeed, availabilitySignals] = publicProfileData?.chef.id
    ? await Promise.all([
        getPublicChefReviewFeed(publicProfileData.chef.id),
        publicProfileData.chef.show_availability_signals
          ? getPublicAvailabilitySignals(publicProfileData.chef.id)
          : Promise.resolve([]),
      ])
    : [null, []]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-100">Client Preview</h1>
        <p className="text-stone-400 mt-1">
          See exactly what your clients experience - your public profile and their portal.
        </p>
      </div>

      <ClientPreviewTabs
        slug={profile?.slug ?? null}
        publicProfileData={publicProfileData}
        reviewFeed={reviewFeed}
        availabilitySignals={availabilitySignals}
        clients={clients}
      />
    </div>
  )
}
