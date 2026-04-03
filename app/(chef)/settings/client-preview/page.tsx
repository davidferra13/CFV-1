// Client Preview Page - lets chefs see exactly what their clients experience.
// Two tabs: Public Profile (inline render) and Client Portal (live data, read-only).
// NOTE: We render the public profile inline (not via iframe) because next.config.js
// sets X-Frame-Options: DENY globally, which blocks iframes of our own pages.

import type { Metadata } from 'next'
import { getChefSlug, getPublicChefProfile } from '@/lib/profile/actions'
import { getPreviewClients } from '@/lib/preview/client-portal-preview-actions'
import { getPublicChefReviewFeed } from '@/lib/reviews/public-actions'
import { getPublicAvailabilitySignals } from '@/lib/calendar/entry-actions'
import {
  getPublicWorkHistory,
  getPublicAchievements,
  getPublicCharityImpact,
} from '@/lib/credentials/actions'
import { getPublicPortfolio } from '@/lib/events/photo-actions'
import { createServerClient } from '@/lib/db/server'
import { ClientPreviewTabs } from './client-preview-tabs'

export const metadata: Metadata = { title: 'Client Preview' }

export default async function ClientPreviewPage() {
  // requireChef() is invoked internally by both getChefSlug() and getPreviewClients()
  const [profile, clients] = await Promise.all([getChefSlug(), getPreviewClients()])

  // Fetch the full public profile data (same as what /chef/[slug] renders)
  const publicProfileData = profile?.slug ? await getPublicChefProfile(profile.slug) : null

  const chefId = publicProfileData?.chef.id ?? null

  // Fetch review, availability, and credentials data so preview matches live public page
  const [
    reviewFeed,
    availabilitySignals,
    workHistory,
    achievements,
    charityImpact,
    portfolio,
    chefCredRow,
  ] = chefId
    ? await Promise.all([
        getPublicChefReviewFeed(chefId),
        publicProfileData!.chef.show_availability_signals
          ? getPublicAvailabilitySignals(chefId)
          : Promise.resolve([]),
        getPublicWorkHistory(chefId).catch(() => []),
        getPublicAchievements(chefId).catch(() => []),
        getPublicCharityImpact(chefId).catch(() => ({
          totalHours: 0,
          totalEntries: 0,
          uniqueOrgs: 0,
          verified501cOrgs: 0,
          publicCharityPercent: null,
          publicCharityNote: null,
          showPublicCharity: false,
          organizations: [],
        })),
        getPublicPortfolio(chefId).catch(() => []),
        (async () => {
          try {
            const db: any = createServerClient({ admin: true })
            const { data } = await db
              .from('chefs')
              .select('show_resume_available_note')
              .eq('id', chefId)
              .single()
            return { showResumeAvailableNote: data?.show_resume_available_note ?? false }
          } catch {
            return { showResumeAvailableNote: false }
          }
        })(),
      ])
    : [
        null,
        [],
        [],
        [],
        {
          totalHours: 0,
          totalEntries: 0,
          uniqueOrgs: 0,
          verified501cOrgs: 0,
          publicCharityPercent: null,
          publicCharityNote: null,
          showPublicCharity: false,
          organizations: [],
        },
        [],
        { showResumeAvailableNote: false },
      ]

  const credentialsData = {
    workHistory: workHistory ?? [],
    achievements: achievements ?? [],
    portfolio: portfolio ?? [],
    charityImpact: charityImpact ?? {
      totalHours: 0,
      totalEntries: 0,
      uniqueOrgs: 0,
      verified501cOrgs: 0,
      publicCharityPercent: null,
      publicCharityNote: null,
      showPublicCharity: false,
      organizations: [],
    },
    showResumeNote: (chefCredRow as any)?.showResumeAvailableNote ?? false,
  }

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
        credentialsData={credentialsData}
      />
    </div>
  )
}
